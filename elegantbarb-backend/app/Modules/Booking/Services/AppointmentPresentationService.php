<?php

namespace App\Modules\Booking\Services;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use Illuminate\Support\Facades\DB;

final class AppointmentPresentationService
{
    public function present(Appointment $appointment, ?User $viewer = null, bool $detail = false): array
    {
        $data = $appointment->attributesToArray();
        unset($data['idempotency_key'], $data['deleted_at'], $data['checkout_snapshot']['request_fingerprint']);
        $data['timezone'] = config('booking.timezone');
        $data['currency'] = $appointment->currency ?? 'COP';
        $data['duration_minutes'] = (int) ($appointment->duration_minutes ?? $appointment->service?->duration_minutes);
        $data['client'] = $appointment->client?->only(['id', 'name', 'email', 'phone']);
        $data['professional'] = $appointment->professional?->only(['id', 'name', 'specialty', 'photo_url']);
        $data['business'] = $appointment->business?->only(['id', 'name', 'slug', 'phone', 'email', 'logo_url', 'banner_url']);
        // Avoid repeating large legacy base64 images for every row in the agenda.
        if (! $detail) {
            foreach (['professional' => ['photo_url'], 'business' => ['logo_url', 'banner_url']] as $relation => $fields) {
                foreach ($fields as $field) {
                    if (isset($data[$relation][$field]) && str_starts_with($data[$relation][$field], 'data:')) {
                        $data[$relation][$field] = null;
                    }
                }
            }
        }
        $data['branch'] = $appointment->branch?->only(['id', 'business_id', 'name', 'address', 'phone', 'lat', 'lng']);
        $data['service'] = $appointment->service?->only(['id', 'business_id', 'name', 'description', 'price', 'duration_minutes']);
        $active = in_array($appointment->getRawOriginal('status'), ['PENDING', 'CONFIRMED', 'RESCHEDULED'], true);
        $clientOwner = $viewer?->role === User::ROLE_CLIENT && (int) $appointment->client?->user_id === $viewer->id;
        $data['review_id'] = $appointment->getAttribute('review_id');
        $data['booking_model'] = $appointment->booking_model ?? ($appointment->service ? BookingRules::model($appointment->service, $appointment->business) : null);
        $data['allowed_actions'] = [
            'cancel' => $active && (! $clientOwner || BookingRules::allowsAction($appointment, 'cancel')) && ($viewer?->hasEffectivePermission('appointments.cancel') ?? false),
            'reschedule' => $active && (! $clientOwner || BookingRules::allowsAction($appointment, 'reschedule')) && ($viewer?->hasEffectivePermission('appointments.edit') ?? false),
            'review' => $clientOwner && $appointment->getRawOriginal('status') === 'COMPLETED' && ! $data['review_id'],
            'rebook' => $viewer?->role === User::ROLE_CLIENT && ($viewer->hasEffectivePermission('appointments.create')),
        ];
        if (! $detail) return $data;
        $data['resource'] = $appointment->resource?->only(['id', 'name', 'type']);
        $redemption = DB::table('marketing.promotion_redemptions as r')->join('marketing.promotions as p', 'p.id', '=', 'r.promotion_id')
            ->where('r.appointment_id', $appointment->id)->select('p.id', 'p.title', 'p.promo_code as code')->first();
        $data['promotion'] = $redemption;
        $data['payments'] = DB::table('finance.payments')->where('appointment_id', $appointment->id)->orderBy('id')
            ->get(['id', 'amount', 'currency', 'method', 'status', 'paid_at'])->map(fn ($payment) => [
                'id' => $payment->id, 'amount' => (float) $payment->amount, 'currency' => $payment->currency,
                'method' => $payment->method, 'status' => $payment->status, 'paid_at' => $payment->paid_at,
            ])->all();
        $events = DB::table('booking.appointment_events')->where('appointment_id', $appointment->id)->get()->map(fn ($event) => [
            'id' => 'event-'.$event->id, 'type' => $event->type, 'title' => $this->title($event->type),
            'description' => $event->description, 'created_at' => $event->created_at,
        ])->all();
        $types = array_column($events, 'type');
        foreach (['created' => $appointment->created_at, 'completed' => $appointment->completed_at, 'cancelled' => $appointment->cancelled_at] as $type => $at) {
            if ($at && ! in_array($type, $types, true)) $events[] = ['id' => 'legacy-'.$type, 'type' => $type, 'title' => $this->title($type), 'description' => null, 'created_at' => $at->toIso8601String()];
        }
        if (! in_array('rescheduled', $types, true)) foreach (DB::table('booking.appointment_reschedules')->where('appointment_id', $appointment->id)->get() as $event) {
            $events[] = ['id' => 'reschedule-'.$event->id, 'type' => 'rescheduled', 'title' => $this->title('rescheduled'),
                'description' => $event->old_date.' '.$event->old_start_time.' → '.$event->new_date.' '.$event->new_start_time,
                'created_at' => $event->created_at];
        }
        usort($events, fn ($a, $b) => strtotime($a['created_at']) <=> strtotime($b['created_at']));
        $data['timeline'] = $events;
        return $data;
    }

    private function title(string $type): string
    {
        return match ($type) {
            'created' => 'Reserva creada', 'confirmed' => 'Reserva confirmada', 'cancelled' => 'Reserva cancelada',
            'completed' => 'Servicio completado', 'rescheduled' => 'Reserva reprogramada', 'no_show' => 'No asistió',
            'reminder' => 'Recordatorio registrado',
            default => 'Reserva actualizada',
        };
    }
}
