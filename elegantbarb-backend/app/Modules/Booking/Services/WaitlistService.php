<?php

declare(strict_types=1);

namespace App\Modules\Booking\Services;

use App\Core\DTOs\ServiceResponse;
use App\Models\User;
use App\Modules\Booking\Models\Waitlist;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\Platform\Models\Notification;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class WaitlistService
{
    public function join(array $data, int $clientId): ServiceResponse
    {
        $client = Client::findOrFail($clientId);
        $service = Service::whereKey($data['service_id'])->where('business_id', $data['business_id'])->where('is_active', true)->firstOrFail();
        $from = CarbonImmutable::parse($data['preferred_date'] ?? 'today', config('booking.timezone'));
        $to = CarbonImmutable::parse($data['preferred_date_to'] ?? $from->toDateString(), config('booking.timezone'));
        if ($to->lt($from) || $to->gt($from->addDays(6))) throw ValidationException::withMessages(['preferred_date_to' => 'Selecciona un rango de hasta siete días.']);
        $branchId = $data['branch_id'] ?? BusinessBranch::where('business_id', $service->business_id)->where('is_active', true)->whereNull('deleted_at')->orderByDesc('is_main_branch')->value('id');
        $criteria = array_intersect_key($data, array_flip(['business_id','service_id','professional_id','resource_id','duration_minutes','participants','preferred_time_start','preferred_time_end']));
        $criteria = array_replace(['professional_id' => null, 'resource_id' => null, 'duration_minutes' => $service->duration_minutes,
            'participants' => 1, 'preferred_time_start' => null, 'preferred_time_end' => null], $criteria,
            ['branch_id' => $branchId, 'preferred_date' => $from->toDateString(), 'preferred_date_to' => $to->toDateString()]);
        // Validate the exact booking context even when every slot is currently occupied.
        app(AvailabilityService::class)->slots($this->bookingCriteria($criteria, $client->user_id, $from->toDateString()));
        ksort($criteria);
        $key = hash('sha256', json_encode($criteria, JSON_THROW_ON_ERROR));
        return DB::transaction(function () use ($client, $criteria, $key, $to) {
            User::whereKey($client->user_id)->lockForUpdate()->firstOrFail();
            $ids = Client::where('user_id', $client->user_id)->pluck('id');
            $existing = Waitlist::whereIn('client_id', $ids)->where('criteria_key', $key)->whereIn('status', ['PENDING','NOTIFIED'])->where('expires_at', '>', now())->first();
            if ($existing) return ServiceResponse::success($existing, 'Ya tienes una alerta con estos criterios');
            $entry = Waitlist::create($criteria + ['client_id' => $client->id, 'criteria_key' => $key, 'status' => 'PENDING', 'expires_at' => $to->endOfDay()]);
            return ServiceResponse::success($entry, 'Te avisaremos si aparece disponibilidad. No se realizará una reserva automática.', 201);
        });
    }

    public function notifyAvailableSlots(int $businessId, int $serviceId, string $date): void
    {
        // A shared resource can serve several services: recheck all matching alerts in the business.
        Waitlist::where('business_id', $businessId)->where('status', 'PENDING')->where('expires_at', '>', now())
            ->where(fn ($q) => $q->whereNull('preferred_date')->orWhere('preferred_date', '<=', $date))
            ->where(fn ($q) => $q->whereNull('preferred_date_to')->orWhere('preferred_date_to', '>=', $date))
            ->orderBy('id')->chunkById(50, fn ($entries) => $entries->each(fn ($entry) => $this->evaluate($entry->id, $date)));
    }

    public function scanPending(): int
    {
        $count = 0;
        Waitlist::where('status', 'PENDING')->where('expires_at', '>', now())->orderBy('id')->chunkById(50, function ($entries) use (&$count) {
            foreach ($entries as $entry) {
                $from = CarbonImmutable::parse($entry->preferred_date ?? 'today', config('booking.timezone'))->max(CarbonImmutable::today(config('booking.timezone')));
                $to = CarbonImmutable::parse($entry->preferred_date_to ?? $from, config('booking.timezone'))->min($from->addDays(6));
                for ($day = $from; $day <= $to; $day = $day->addDay()) if ($this->evaluate($entry->id, $day->toDateString())) { $count++; break; }
            }
        });
        return $count;
    }

    private function evaluate(int $id, string $date): bool
    {
        return DB::transaction(function () use ($id, $date) {
            $entry = Waitlist::with(['client', 'service', 'business'])->whereKey($id)->lockForUpdate()->first();
            if (! $entry || $entry->status !== 'PENDING' || $entry->expires_at?->isPast() || ! $entry->client?->user_id) return false;
            $criteria = $entry->getAttributes();
            $criteria['branch_id'] ??= BusinessBranch::where('business_id', $entry->business_id)->where('is_active', true)->value('id');
            try {
                $result = app(AvailabilityService::class)->slots($this->bookingCriteria($criteria, $entry->client->user_id, $date), true);
            } catch (ValidationException $exception) { return false; }
            $slot = $result['slots'][0] ?? null;
            if (! $slot || ! $slot['available']) return false;
            $url = '/cliente/business/'.$entry->business_id.'?'.http_build_query(['book' => 1, 'service_id' => $entry->service_id, 'branch_id' => $criteria['branch_id'],
                'date' => $date, 'time' => substr($slot['start_time'], 0, 5), 'resource_id' => $slot['resource_id'],
                'professional_id' => $slot['professional_id'], 'duration_minutes' => $slot['duration_minutes'], 'participants' => $slot['participants']]);
            $payload = ['title' => 'Hay disponibilidad para tu alerta', 'message' => $entry->service->name.' · '.$date.' a las '.substr($slot['start_time'], 0, 5).'. Confirma la reserva para asegurar el cupo.',
                'url' => $url, 'event_type' => 'waitlist_available', 'waitlist_id' => $entry->id, 'booking_code' => null,
                'service' => $entry->service->name, 'business' => $entry->business->name, 'branch' => BusinessBranch::whereKey($criteria['branch_id'])->value('name'),
                'date' => $date, 'time' => substr($slot['start_time'], 0, 5), 'timezone' => config('booking.timezone'), 'professional' => $slot['professional_name'],
                'business_id' => $entry->business_id, 'service_id' => $entry->service_id, 'slot' => $slot];
            $notification = Notification::create(['user_id' => $entry->client->user_id, 'type' => 'WAITLIST_SLOT_AVAILABLE', 'title' => $payload['title'],
                'message' => $payload['message'], 'data' => $payload, 'read' => false]);
            DB::table('booking.notification_deliveries')->insert(['waitlist_id' => $entry->id, 'appointment_id' => null,
                'user_id' => $entry->client->user_id, 'event_key' => 'waitlist:'.$entry->id, 'notification_id' => $notification->id,
                'payload' => json_encode($payload, JSON_THROW_ON_ERROR), 'status' => config('booking.email_enabled') ? 'PENDING' : 'DISABLED', 'created_at' => now(), 'updated_at' => now()]);
            $entry->update(['status' => 'NOTIFIED', 'notified_at' => now()]);
            return true;
        });
    }

    private function bookingCriteria(array $data, ?int $userId, string $date): array
    {
        return array_replace(array_intersect_key($data, array_flip(['business_id','branch_id','service_id','professional_id','resource_id','duration_minutes','participants'])),
            ['date' => $date, 'client_user_id' => $userId, 'time_from' => isset($data['preferred_time_start']) ? substr($data['preferred_time_start'], 0, 5) : null,
                'time_to' => isset($data['preferred_time_end']) ? substr($data['preferred_time_end'], 0, 5) : null]);
    }

    public function cancel(int $waitlistId, int $clientId): ServiceResponse
    {
        $userId = Client::findOrFail($clientId)->user_id;
        $entry = Waitlist::whereKey($waitlistId)->whereHas('client', fn ($q) => $q->where('user_id', $userId))->firstOrFail();
        DB::transaction(function () use ($entry) {
            $entry = Waitlist::whereKey($entry->id)->lockForUpdate()->firstOrFail();
            $entry->update(['status' => 'CANCELLED']);
            DB::table('booking.notification_deliveries')->where('waitlist_id', $entry->id)->where('status', 'PENDING')->update(['status' => 'SUPPRESSED', 'last_error' => 'ALERT_CANCELLED', 'updated_at' => now()]);
        });
        return ServiceResponse::success(null, 'Alerta cancelada');
    }

    public function myWaitlist(int $clientId): ServiceResponse
    {
        $userId = Client::findOrFail($clientId)->user_id;
        return ServiceResponse::success(Waitlist::with(['business:id,name,slug', 'service:id,name,booking_model,duration_minutes', 'professional:id,name', 'branch:id,name', 'resource:id,name'])
            ->whereHas('client', fn ($q) => $q->where('user_id', $userId))->whereIn('status', ['PENDING','NOTIFIED'])->where('expires_at', '>', now())->latest()->get());
    }

    public function businessWaitlists(int $businessId): ServiceResponse
    {
        return ServiceResponse::success(Waitlist::with(['client:id,name', 'service:id,name', 'professional:id,name', 'branch:id,name', 'resource:id,name'])
            ->where('business_id', $businessId)->whereIn('status', ['PENDING','NOTIFIED'])->where('expires_at', '>', now())->latest()->paginate(50));
    }

    public function expireOld(): int
    {
        return Waitlist::whereIn('status', ['PENDING','NOTIFIED'])->where('expires_at', '<', now())->update(['status' => 'EXPIRED']);
    }
}
