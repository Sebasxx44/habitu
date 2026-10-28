<?php

declare(strict_types=1);

namespace App\Modules\Booking\Services;

use App\Core\Support\Money;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Marketing\Models\PromotionRedemption;
use App\Modules\People\Models\Client;
use App\Services\NotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class AppointmentPricingService
{
    public function quote(array $reservation, ?int $clientId = null, bool $lock = false): array
    {
        $dynamic = app(\App\Modules\Catalog\Services\DynamicPricingService::class)->evaluate($reservation);
        $subtotal = Money::minor($dynamic['price']);
        $discount = 0;
        $promotion = null;
        $code = trim((string) ($reservation['promo_code'] ?? ''));
        if ($code !== '') {
            $promotion = Promotion::where('business_id', $reservation['business_id'])->whereRaw('LOWER(promo_code) = ?', [mb_strtolower($code)])
                ->orderBy('id')->when($lock, fn ($q) => $q->lockForUpdate())->first();
            if (! $promotion || ! $promotion->isValid()) $this->invalid('La promoción no está activa en este negocio.');
            if (! app(\App\Modules\Marketing\Services\ReferralService::class)->canUseReward($promotion->id, $clientId ? Client::whereKey($clientId)->value('user_id') : null)) $this->invalid('Este beneficio pertenece a otra cuenta o fue revocado.');
            $date = CarbonImmutable::parse($reservation['date'], config('booking.timezone'));
            if ($date->lt($promotion->start_date->startOfDay()) || $date->gt($promotion->end_date->endOfDay())) $this->invalid('La promoción no aplica a la fecha seleccionada.');
            if ($promotion->business_category_id && (int) $promotion->business?->business_category_id !== (int) $promotion->business_category_id) $this->invalid('La promoción no aplica a esta categoría.');
            if ($subtotal < Money::minor($promotion->min_purchase ?? 0)) $this->invalid('No se alcanza el monto mínimo de esta promoción.');
            $pivot = DB::table('marketing.promotion_service')->where('promotion_id', $promotion->id)->where('service_id', $reservation['service_id'])->first();
            if (! $pivot && $promotion->services()->exists()) $this->invalid('La promoción no aplica a este servicio.');
            if ($clientId && $promotion->per_user_limit !== null) {
                $userId = Client::whereKey($clientId)->value('user_id');
                $ids = $userId ? Client::where('user_id', $userId)->pluck('id')->all() : [$clientId];
                if ($promotion->usages()->whereIn('client_id', $ids)->count() >= $promotion->per_user_limit) $this->invalid('Ya utilizaste esta promoción el máximo permitido.');
            }
            $type = $pivot?->type ?? $promotion->type;
            $value = Money::minor($pivot?->discount ?? $promotion->discount);
            $discount = match ($type) {
                'PERCENTAGE', 'PORCENTAJE' => intdiv($subtotal * min(10000, $value) + 5000, 10000),
                'FIXED_AMOUNT', 'FIXED', 'FIJO' => $value,
                default => throw ValidationException::withMessages(['promo_code' => 'Este tipo de promoción no se puede aplicar a una reserva individual.']),
            };
            if ($promotion->max_discount !== null) $discount = min($discount, Money::minor($promotion->max_discount));
            $discount = min($subtotal, max(0, $discount));
        }
        $membership = null;
        if ($code === '' && $clientId) {
            $membership = app(\App\Modules\Subscriptions\Services\MembershipService::class)->bestBenefit($reservation, $clientId, $subtotal, $lock);
            if ($membership) { $discount = $membership['discount_minor']; unset($membership['discount_minor']); }
        }
        return ['membership' => $membership, 'dynamic_pricing' => $dynamic, 'subtotal' => (float) Money::decimal($subtotal), 'discount' => (float) Money::decimal($discount),
            'total' => (float) Money::decimal($subtotal - $discount), 'currency' => $dynamic['currency'],
            'duration_minutes' => (int) ($reservation['service_duration_minutes'] ?? $reservation['duration_minutes'] ?? 0), 'timezone' => config('booking.timezone'),
            'professional' => empty($reservation['professional_id']) ? null : ['id' => $reservation['professional_id'], 'name' => $reservation['professional_name'] ?? null],
            'resource_id' => $reservation['resource_id'] ?? null,
            'resource' => empty($reservation['resource_id']) ? null : ['id' => $reservation['resource_id'], 'name' => $reservation['resource_name'] ?? null],
            'booking_model' => $reservation['booking_model'] ?? null, 'participants' => $reservation['participants'] ?? 1,
            'remaining_capacity' => $reservation['remaining_capacity'] ?? $reservation['booking_capacity'] ?? null,
            'requires_confirmation' => $reservation['requires_confirmation'] ?? true,
            'promotion' => $promotion ? ['id' => $promotion->id, 'title' => $promotion->title, 'code' => $promotion->promo_code] : null];
    }

    public function redeem(array $quote, int $appointmentId, int $clientId): void
    {
        if (! empty($quote['membership'])) app(\App\Modules\Subscriptions\Services\MembershipService::class)->redeemQuote($quote['membership'], $appointmentId, $quote['discount']);
        if (! $quote['promotion']) return;
        DB::transaction(function () use ($quote, $appointmentId, $clientId): void {
            $promotion = Promotion::lockForUpdate()->findOrFail($quote['promotion']['id']);
            $previous = $promotion->usages()->where('appointment_id', $appointmentId)->first();
            if ($previous) { abort_unless((int) $previous->client_id === $clientId, 409); return; }
            $appointment = Appointment::findOrFail($appointmentId);
            abort_unless((int) $appointment->business_id === (int) $promotion->business_id && (int) $appointment->client_id === $clientId, 422);
            if (! $promotion->isValid()) $this->invalid('La promoción cambió. Revisa el precio y vuelve a confirmar.');
            $client = Client::findOrFail($clientId);
            $clientIds = $client->user_id ? Client::where('user_id', $client->user_id)->pluck('id') : [$clientId];
            if ($promotion->per_user_limit !== null && $promotion->usages()->whereIn('client_id', $clientIds)->count() >= $promotion->per_user_limit) {
                $this->invalid('Ya utilizaste esta promoción el máximo permitido.');
            }
            PromotionRedemption::create(['promotion_id' => $promotion->id, 'appointment_id' => $appointmentId,
                'client_id' => $clientId, 'saved_amount' => $quote['discount']]);
            $promotion->increment('usage_count');
            if ($client->user_id) app(NotificationService::class)->promotionUsed((int) $client->user_id, (string) $promotion->promo_code, (float) $quote['discount']);
        }, 3);
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['promo_code' => $message]);
    }

    public function releaseUnpaidHold(int $appointmentId): void
    {
        $redemption = PromotionRedemption::where('appointment_id', $appointmentId)->first();
        if (! $redemption) return;
        $promotion = Promotion::whereKey($redemption->promotion_id)->lockForUpdate()->first();
        if (PromotionRedemption::whereKey($redemption->id)->delete() && $promotion && $promotion->usage_count > 0) $promotion->decrement('usage_count');
    }
}
