<?php

declare(strict_types=1);

namespace App\Modules\Subscriptions\Services;

use App\Core\DTOs\ServiceResponse;
use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\People\Models\Client;
use App\Modules\Subscriptions\Models\ClientMembership;
use App\Modules\Subscriptions\Models\MembershipPlan;
use App\Modules\Subscriptions\Models\MembershipUsage;
use App\Services\NotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MembershipService
{
    public function getPlans(?int $businessId): ServiceResponse
    {
        return ServiceResponse::success(MembershipPlan::with('business:id,name,slug,logo_url')->active()
            ->whereHas('business', fn ($query) => $query->where('is_active', true))
            ->when($businessId, fn ($query) => $query->where('business_id', $businessId))->orderBy('sort_order')->get());
    }

    public function createPlan(array $data): ServiceResponse
    {
        return ServiceResponse::success(MembershipPlan::create($data), 'Plan creado', 201);
    }

    public function updatePlan(int $planId, array $data): ServiceResponse
    {
        $plan = MembershipPlan::find($planId);
        if (! $plan) return ServiceResponse::notFound('Plan');
        $plan->update($data);
        return ServiceResponse::success($plan, 'Plan actualizado');
    }

    public function subscribe(int $clientId, int $planId): ServiceResponse
    {
        $client = Client::findOrFail($clientId);
        return $this->subscribeForUser((int) $client->user_id, $planId);
    }

    public function subscribeForUser(int $userId, int $planId): ServiceResponse
    {
        return DB::transaction(function () use ($userId, $planId) {
            $user = User::whereKey($userId)->lockForUpdate()->firstOrFail();
            $plan = $this->activePlan($planId, true);
            if (Money::minor($plan->price) > 0) return ServiceResponse::error('Este plan requiere un pago verificado. Continúa al pago seguro.', null, 422);
            $client = $this->client($user, $plan->business_id);
            $existing = ClientMembership::whereIn('client_id', Client::where('user_id', $userId)->select('id'))
                ->where('membership_plan_id', $planId)->where('ends_at', '>', now())->first();
            if ($existing) return $existing->status === 'ACTIVE'
                ? ServiceResponse::success($existing->load('plan.business'), 'Membresía activa', 201)
                : ServiceResponse::error('Este plan gratuito ya fue utilizado en el período actual.', null, 422);
            return ServiceResponse::success($this->activate($client, $plan, $this->snapshot($plan)), 'Membresía activada', 201);
        }, 3);
    }

    /** Called only by the checkout service; all prices and entitlements are server-derived. */
    public function prepareCheckout(int $userId, int $planId): array
    {
        $user = User::findOrFail($userId);
        abort_unless($user->role === User::ROLE_CLIENT, 403);
        $plan = $this->activePlan($planId);
        if (Money::minor($plan->price) <= 0) $this->invalid('Este plan es gratuito; actívalo sin pasarela.');
        if ($plan->currency !== 'COP') $this->invalid('El pago seguro de membresías admite COP.');
        if (ClientMembership::whereIn('client_id', Client::where('user_id', $userId)->select('id'))->where('membership_plan_id', $planId)
            ->where('status', 'ACTIVE')->where('ends_at', '>', now())->exists()) $this->invalid('Ya tienes este plan activo. Puedes renovarlo cuando finalice.');
        return ['plan_id' => $plan->id, 'amount' => Money::decimal(Money::minor($plan->price)), 'currency' => $plan->currency,
            'metadata' => $this->snapshot($plan)];
    }

    /** Internal webhook fulfillment. Never expose this method as a client activation endpoint. */
    public function fulfillVerifiedPayment(int $userId, int $planId, string $orderId, string $amount, array $metadata = []): ClientMembership
    {
        return DB::transaction(function () use ($userId, $planId, $orderId, $amount, $metadata) {
            $user = User::whereKey($userId)->lockForUpdate()->firstOrFail();
            $reference = 'WOMPI:MEMBERSHIP:'.$orderId;
            $existing = ClientMembership::where('payment_reference', $reference)->first();
            if ($existing) {
                abort_unless((int) $existing->client->user_id === $userId && (int) $existing->membership_plan_id === $planId, 409);
                return $existing;
            }
            $plan = MembershipPlan::whereKey($planId)->lockForUpdate()->firstOrFail();
            // Snapshot originates in the server-created checkout order, never in browser input.
            if ((int) ($metadata['plan_id'] ?? 0) !== $planId || (int) ($metadata['business_id'] ?? 0) !== (int) $plan->business_id
                || ($metadata['currency'] ?? '') !== 'COP' || Money::minor($metadata['price'] ?? 0) !== Money::minor($amount)
                || Money::minor($amount) <= 0) $this->invalid('El pago no corresponde a este plan.');
            return $this->activate($this->client($user, $plan->business_id), $plan, $metadata, $reference);
        }, 3);
    }

    public function revokeVerifiedPayment(string $orderId, string $reason): void
    {
        DB::transaction(function () use ($orderId, $reason): void {
            $membership = ClientMembership::where('payment_reference', 'WOMPI:MEMBERSHIP:'.$orderId)->lockForUpdate()->first();
            if (! $membership || $membership->status === 'SUSPENDED') return;
            $membership->update(['status' => 'SUSPENDED', 'auto_renew' => false,
                'plan_snapshot' => array_merge($membership->plan_snapshot ?? [], ['payment_review_reason' => $reason, 'suspended_at' => now()->toIso8601String()])]);
            $this->notify($membership, 'MEMBERSHIP_PAYMENT_REVIEW', 'Membresía en revisión', 'El pago está en revisión. Contacta al negocio para resolverlo.');
        }, 3);
    }

    public function getMyMemberships(int $clientId): ServiceResponse
    {
        return $this->getMyForUser((int) Client::findOrFail($clientId)->user_id);
    }

    public function getMyForUser(int $userId): ServiceResponse
    {
        return ServiceResponse::success(ClientMembership::whereIn('client_id', Client::where('user_id', $userId)->select('id'))
            ->with('plan.business:id,name,slug,logo_url')->orderByDesc('created_at')->get());
    }

    public function cancelMembership(int $membershipId, int $clientId): ServiceResponse
    {
        return $this->cancelForUser($membershipId, (int) Client::findOrFail($clientId)->user_id);
    }

    public function cancelForUser(int $membershipId, int $userId): ServiceResponse
    {
        return DB::transaction(function () use ($membershipId, $userId) {
            $membership = ClientMembership::whereIn('client_id', Client::where('user_id', $userId)->select('id'))->lockForUpdate()->find($membershipId);
            if (! $membership) return ServiceResponse::notFound('Membership');
            if ($membership->status === 'SUSPENDED') return ServiceResponse::error('El pago está en revisión. Contacta al negocio antes de cancelar.', null, 422);
            if ($membership->status === 'CANCELLED') return ServiceResponse::success($membership->load('plan.business'), 'Membresía cancelada');
            $membership->update(['status' => 'CANCELLED', 'cancelled_at' => now(), 'auto_renew' => false]);
            $this->notify($membership, 'MEMBERSHIP_CANCELLED', 'Membresía cancelada', 'Tu membresía '.$membership->plan->name.' fue cancelada.');
            return ServiceResponse::success($membership->load('plan.business'), 'Membresía cancelada');
        }, 3);
    }

    public function consumeAppointment(int $membershipId, int $appointmentId): ServiceResponse
    {
        return DB::transaction(function () use ($membershipId, $appointmentId) {
            $membership = ClientMembership::lockForUpdate()->findOrFail($membershipId);
            $appointment = Appointment::findOrFail($appointmentId);
            if (MembershipUsage::where('client_membership_id', $membershipId)->where('appointment_id', $appointmentId)->exists()) return ServiceResponse::success($membership);
            if (! $membership->isActive() || $membership->appointments_remaining < 1
                || (int) $appointment->client?->user_id !== (int) $membership->client->user_id
                || (int) $appointment->business_id !== (int) $membership->plan->business_id) $this->invalid('La membresía no puede utilizarse para esta reserva.');
            $this->recordUsage($membership, $appointmentId, (float) $appointment->price, true);
            return ServiceResponse::success($membership->fresh(), 'Beneficio utilizado');
        }, 3);
    }

    public function bestBenefit(array $reservation, int $clientId, int $subtotal, bool $lock): ?array
    {
        $userId = Client::whereKey($clientId)->value('user_id');
        if (! $userId) return null;
        $date = CarbonImmutable::parse($reservation['date'].' '.$reservation['start_time'], config('booking.timezone'))->utc();
        $memberships = ClientMembership::with('plan')->whereIn('client_id', Client::where('user_id', $userId)->select('id'))
            ->whereHas('plan', fn ($query) => $query->where('business_id', $reservation['business_id']))
            ->where('status', 'ACTIVE')->where('starts_at', '<=', $date)->where('ends_at', '>', $date)
            ->orderBy('ends_at')->orderBy('id')->when($lock, fn ($query) => $query->lockForUpdate())->get();
        $best = null;
        foreach ($memberships as $membership) {
            $terms = $membership->plan_snapshot ?? $this->snapshot($membership->plan);
            $services = array_map('intval', $terms['included_services'] ?? []);
            if ($services && ! in_array((int) $reservation['service_id'], $services, true)) continue;
            $included = $membership->appointments_remaining > 0;
            $discount = $included ? $subtotal : intdiv($subtotal * min(10000, Money::minor($terms['discount_percentage'] ?? 0)) + 5000, 10000);
            if ($discount > 0 && ($best === null || $discount > $best['discount_minor'])) $best = [
                'id' => $membership->id, 'plan_id' => $membership->membership_plan_id, 'name' => $terms['name'] ?? $membership->plan->name,
                'included_appointment' => $included, 'discount_minor' => $discount, 'expires_at' => $membership->ends_at->toIso8601String(),
            ];
        }
        return $best;
    }

    public function redeemQuote(array $benefit, int $appointmentId, float $discount): void
    {
        $membership = ClientMembership::lockForUpdate()->findOrFail($benefit['id']);
        if (MembershipUsage::where('client_membership_id', $membership->id)->where('appointment_id', $appointmentId)->exists()) return;
        if ($membership->status !== 'ACTIVE' || ($benefit['included_appointment'] && $membership->appointments_remaining < 1)) $this->invalid('La membresía cambió. Revisa el precio y vuelve a confirmar.');
        $this->recordUsage($membership, $appointmentId, $discount, $benefit['included_appointment']);
    }

    public function restoreCancelled(int $appointmentId): void
    {
        foreach (MembershipUsage::where('appointment_id', $appointmentId)->whereNull('restored_at')->lockForUpdate()->get() as $usage) {
            $membership = ClientMembership::lockForUpdate()->findOrFail($usage->client_membership_id);
            if ($usage->usage_type === 'APPOINTMENT') $membership->update(['appointments_used' => max(0, $membership->appointments_used - 1), 'appointments_remaining' => $membership->appointments_remaining + 1]);
            $usage->update(['restored_at' => now()]);
        }
    }

    public function validateReschedule(int $appointmentId, string $date, string $time): void
    {
        $when = CarbonImmutable::parse($date.' '.$time, config('booking.timezone'));
        foreach (MembershipUsage::where('appointment_id', $appointmentId)->whereNull('restored_at')->with('clientMembership')->get() as $usage) {
            $membership = $usage->clientMembership;
            if ($membership->status === 'SUSPENDED') $this->invalid('El pago de esta membresía está en revisión. Contacta al negocio antes de reprogramar.');
            if ($when->lt($membership->starts_at) || $when->gte($membership->ends_at)) $this->invalid('La nueva fecha debe estar dentro de la vigencia de la membresía.');
        }
    }

    public function validateFulfillment(int $appointmentId): void
    {
        $suspended = MembershipUsage::where('appointment_id', $appointmentId)->whereNull('restored_at')
            ->whereHas('clientMembership', fn ($query) => $query->where('status', 'SUSPENDED'))->exists();
        if ($suspended) $this->invalid('El pago de la membresía está en revisión. No se puede completar el beneficio hasta resolverlo.');
    }

    private function recordUsage(ClientMembership $membership, int $appointmentId, float $discount, bool $included): void
    {
        if ($included) $membership->update(['appointments_used' => $membership->appointments_used + 1, 'appointments_remaining' => $membership->appointments_remaining - 1]);
        MembershipUsage::create(['client_membership_id' => $membership->id, 'appointment_id' => $appointmentId,
            'usage_type' => $included ? 'APPOINTMENT' : 'DISCOUNT', 'discount_applied' => $discount]);
        $this->notify($membership, 'MEMBERSHIP_USED', 'Beneficio aplicado a tu reserva',
            'Reserva #'.$appointmentId.' · '.$membership->plan->name.'. Ahorro: $'.number_format($discount, 0).' COP.');
    }

    private function snapshot(MembershipPlan $plan): array
    {
        return ['plan_id' => $plan->id, 'business_id' => $plan->business_id, 'name' => $plan->name, 'price' => $plan->price,
            'currency' => $plan->currency, 'billing_cycle' => $plan->billing_cycle, 'appointments_included' => $plan->appointments_included,
            'included_services' => $plan->included_services ?? [], 'discount_percentage' => $plan->discount_percentage, 'benefits' => $plan->benefits ?? []];
    }

    private function activePlan(int $id, bool $lock = false): MembershipPlan
    {
        return MembershipPlan::whereKey($id)->active()->whereHas('business', fn ($query) => $query->where('is_active', true))
            ->when($lock, fn ($query) => $query->lockForUpdate())->firstOrFail();
    }

    private function client(User $user, int $businessId): Client
    {
        return Client::firstOrCreate(['user_id' => $user->id, 'business_id' => $businessId], ['name' => $user->name, 'email' => $user->email]);
    }

    private function activate(Client $client, MembershipPlan $plan, array $snapshot, ?string $reference = null): ClientMembership
    {
        $latest = ClientMembership::where('client_id', $client->id)->where('membership_plan_id', $plan->id)->where('status', 'ACTIVE')->max('ends_at');
        $starts = $latest && CarbonImmutable::parse($latest)->isFuture() ? CarbonImmutable::parse($latest) : CarbonImmutable::now();
        $ends = match ($snapshot['billing_cycle']) { 'QUARTERLY' => $starts->addMonthsNoOverflow(3), 'YEARLY' => $starts->addYearNoOverflow(), default => $starts->addMonthNoOverflow() };
        $membership = ClientMembership::create(['client_id' => $client->id, 'membership_plan_id' => $plan->id, 'status' => 'ACTIVE',
            'starts_at' => $starts, 'ends_at' => $ends, 'appointments_used' => 0, 'appointments_remaining' => $snapshot['appointments_included'],
            'auto_renew' => false, 'payment_reference' => $reference, 'plan_snapshot' => $snapshot])->load('plan.business');
        $this->notify($membership, 'MEMBERSHIP_ACTIVATED', 'Tu membresía está lista',
            $snapshot['name'].' · Vigente del '.$starts->setTimezone(config('booking.timezone'))->format('d/m/Y').' al '.$ends->setTimezone(config('booking.timezone'))->format('d/m/Y').'.');
        return $membership;
    }

    private function notify(ClientMembership $membership, string $type, string $title, string $message): void
    {
        $userId = $membership->client?->user_id;
        if (! $userId) return;
        app(NotificationService::class)->sendToUser((int) $userId, $type, $title, $message,
            ['membership_id' => $membership->id, 'business_id' => $membership->plan->business_id, 'url' => '/cliente/benefits']);
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['membership' => $message]);
    }
}
