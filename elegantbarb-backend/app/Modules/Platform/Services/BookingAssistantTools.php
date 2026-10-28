<?php

namespace App\Modules\Platform\Services;

use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AvailabilityService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Services\DiscoveryService;
use App\Modules\Marketing\Models\Promotion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** Read-only internal tools: scoped history, catalogue, promotions and live reservation availability. */
final class BookingAssistantTools
{
    public function execute(int $userId, string $intent, array $filters): array
    {
        if ($intent === 'reschedule') return ['cards' => $this->appointments($userId, true), 'filters' => $filters,
            'explanation' => ($filters['locale'] ?? 'es') === 'en'
                ? 'Choose your booking to review new times and current conditions. No changes have been made.'
                : 'Elige tu reserva para revisar nuevos horarios y condiciones vigentes. No se ha realizado ningún cambio.'];
        if ($intent === 'my_appointments') return ['cards' => $this->appointments($userId), 'filters' => $filters];
        if ($intent === 'repeat') {
            $last = Appointment::whereHas('client', fn ($query) => $query->where('user_id', $userId))
                ->where('status', 'COMPLETED')->orderByDesc('date')->orderByDesc('start_time')->first();
            if (! $last) return ['cards' => [], 'filters' => $filters, 'explanation' => ($filters['locale'] ?? 'es') === 'en' ? 'You do not have a completed booking to repeat yet.' : 'Aún no tienes una cita completada para repetir.'];
            unset($filters['q'], $filters['promotions']);
            $filters = array_replace($filters, ['business_id' => $last->business_id, 'branch_id' => $last->branch_id,
                'service_id' => $last->service_id, 'professional_id' => $last->professional_id, 'resource_id' => $last->resource_id,
                'duration_minutes' => $last->duration_minutes ?? $last->service?->duration_minutes, 'participants' => $last->participants ?? 1]);
        }
        if (! empty($filters['business_id'])) {
            $business = Business::whereKey($filters['business_id'])->where('is_active', true)->first();
            if (! $business) return ['cards' => [], 'filters' => $filters];
            $catalogQuery = $business->name;
        }
        $businesses = collect();
        $terms = isset($catalogQuery) ? [$catalogQuery] : BookingAssistantLanguage::searchTerms($filters['q'] ?? '');
        foreach ($terms as $term) {
            $result = app(DiscoveryService::class)->search([...$filters, 'q' => $term, 'per_page' => 6, 'page' => 1]);
            foreach ($result->data->items() as $business) $businesses->put($business['id'], $business);
        }
        $cards = [];
        foreach ($businesses as $business) {
            if (! empty($filters['business_id']) && $business['id'] !== (int) $filters['business_id']) continue;
            $services = collect($business['services']);
            if (! empty($filters['q'])) {
                $query = $filters['q'];
                $profiles = \App\Modules\Catalog\Models\Service::whereIn('id', $services->pluck('id'))->with(['professionals' => fn ($q) => $q->where('people.professionals.is_active', true)])->get()->keyBy('id');
                $services = $services->filter(function ($service) use ($query, $business, $profiles, $filters) {
                    if (! empty($filters['service_id'])) return $service['id'] === (int) $filters['service_id'];
                    if (BookingAssistantLanguage::matches($service['name'], $query) || BookingAssistantLanguage::matches($business['category']['name'] ?? '', $query)) return true;
                    if (! BookingAssistantLanguage::isDomain($query) && BookingAssistantLanguage::matches($business['name'], $query)) return true;
                    return $profiles->get($service['id'])?->professionals->contains(fn ($professional) => BookingAssistantLanguage::matches($professional->name.' '.$professional->specialty, $query)) ?? false;
                });
            }
            foreach ($services->take(2) as $service) {
                foreach ($business['branches'] as $branch) {
                    if (! empty($filters['branch_id']) && $branch['id'] !== (int) $filters['branch_id']) continue;
                    if (! empty($filters['zone']) && ! str_contains(Str::ascii(mb_strtolower($branch['address'])), Str::ascii(mb_strtolower($filters['zone'])))) continue;
                    $links = DB::table('catalog.branch_services')->where('service_id', $service['id']);
                    $branchService = (clone $links)->where('branch_id', $branch['id'])->first();
                    if (($branchService && ! $branchService->is_active) || (! $branchService && $links->exists())) continue;
                    $serviceModel = \App\Modules\Catalog\Models\Service::find($service['id']);
                    if (! $serviceModel) continue;
                    $price = (float) \App\Modules\Booking\Services\BookingRules::totalPrice($serviceModel, $branchService?->price_override ?? $serviceModel->price,
                        (int) ($filters['duration_minutes'] ?? $serviceModel->duration_minutes), (int) ($filters['participants'] ?? 1));
                    if (isset($filters['max_price']) && $price > $filters['max_price']) continue;
                    $professionalLink = null;
                    if (! empty($filters['professional_id'])) {
                        $assignments = DB::table('catalog.professional_services')->where('service_id', $service['id']);
                        $professionalLink = (clone $assignments)->where('branch_id', $branch['id'])->where('professional_id', $filters['professional_id'])->first();
                        if (($professionalLink && ! $professionalLink->is_active) || (! $professionalLink && $assignments->exists())) continue;
                    }
                    $date = $filters['date'] ?? $business['next_available']['date'] ?? null;
                    $slots = [];
                    if ($date) try {
                        $availability = app(AvailabilityService::class)->slots([
                            'business_id' => $business['id'], 'branch_id' => $branch['id'], 'service_id' => $service['id'],
                            'professional_id' => $filters['professional_id'] ?? null, 'resource_id' => $filters['resource_id'] ?? null, 'date' => $date,
                            'duration_minutes' => $filters['duration_minutes'] ?? null, 'participants' => $filters['participants'] ?? 1,
                            'time_from' => $filters['time_from'] ?? null, 'time_to' => $filters['time_to'] ?? null, 'client_user_id' => $userId,
                        ]);
                        $slots = collect($availability['slots'])->filter(fn ($slot) => $slot['available']
                            && (! isset($filters['max_price']) || $slot['price'] <= $filters['max_price']))->take(4)->values()->all();
                    } catch (ValidationException) { continue; }
                    if (isset($filters['date']) && $slots === []) continue;
                    $promotion = Promotion::where('business_id', $business['id'])->activeAndValid()
                        ->where(fn ($query) => $query->whereDoesntHave('services')->orWhereHas('services', fn ($query) => $query->where('catalog.services.id', $service['id'])))
                        ->orderBy('end_date')->get()->first(fn ($promotion) => $promotion->canUseBy($userId));
                    if (! empty($filters['promotions']) && ! $promotion) continue;
                    $first = $slots[0] ?? null;
                    $promotionPrices = [];
                    if ($first && $promotion?->promo_code) {
                        try {
                            $clientId = \App\Modules\People\Models\Client::where('user_id', $userId)->value('id');
                            $quote = app(\App\Modules\Booking\Services\AppointmentPricingService::class)->quote([
                                'business_id' => $business['id'], 'service_id' => $service['id'], 'date' => $date,
                                'price' => $first['price'], 'promo_code' => $promotion->promo_code,
                                'duration_minutes' => $first['duration_minutes'], 'professional_id' => $first['professional_id'],
                                'resource_id' => $first['resource_id'], 'participants' => $first['participants'],
                            ], $clientId);
                            $promotionPrices = ['original_price' => $quote['subtotal'], 'discounted_price' => $quote['total'], 'discount_amount' => $quote['discount']];
                        } catch (ValidationException) { /* Keep conditions visible without claiming a discount that cannot be quoted. */ }
                    }

                    $query = array_filter(['book' => 1, 'service_id' => $service['id'], 'branch_id' => $branch['id'],
                        'professional_id' => $first['professional_id'] ?? $filters['professional_id'] ?? null,
                        'resource_id' => $first['resource_id'] ?? $filters['resource_id'] ?? null,
                        'duration_minutes' => $first['duration_minutes'] ?? $filters['duration_minutes'] ?? $service['duration_minutes'], 'participants' => $filters['participants'] ?? 1,
                        'date' => $date, 'time' => isset($first['start_time']) ? substr($first['start_time'], 0, 5) : null], fn ($value) => $value !== null);
                    $cards[] = [...$promotionPrices, 'type' => 'service', 'business_id' => $business['id'], 'business_name' => $business['name'],
                        'branch_id' => $branch['id'], 'branch_name' => $branch['name'], 'address' => $branch['address'],
                        'service_id' => $service['id'], 'service_name' => $service['name'], 'price' => (float) ($first['price'] ?? $price),
                        'currency' => $serviceModel->currency ?? $business['currency'] ?? $serviceModel->business?->currency ?? config('booking.currency', 'COP'), 'duration_minutes' => $first['duration_minutes'] ?? $professionalLink?->duration_override ?? $service['duration_minutes'],
                        'professional_id' => $first['professional_id'] ?? null, 'professional_name' => $first['professional_name'] ?? null,
                        'booking_model' => $service['booking_model'], 'resource_id' => $first['resource_id'] ?? $filters['resource_id'] ?? null,
                        'resource_name' => $first['resource_name'] ?? null, 'participants' => $filters['participants'] ?? 1, 'remaining_capacity' => $first['remaining_capacity'] ?? null,
                        'date' => $date, 'slots' => $slots, 'promotion' => $promotion ? ['id' => $promotion->id, 'title' => $promotion->title,
                            'code' => $promotion->promo_code, 'discount' => (float) $promotion->discount, 'type' => $promotion->type] : null,
                        'checked_at' => now()->toIso8601String(), 'expires_at' => now()->addMinutes(5)->toIso8601String(),
                        'reasons' => array_values(array_filter(['service_match', $first ? 'available_slot' : null, $filters['professional_id'] ?? null ? 'selected_professional' : null, $filters['resource_id'] ?? null ? 'selected_resource' : null])),
                        'url' => '/cliente/business/'.$business['id'].'?'.http_build_query($query)];
                    if (count($cards) >= 6) break 3;
                    break;
                }
            }
        }
        return ['cards' => $cards, 'filters' => $filters];
    }

    private function appointments(int $userId, bool $reschedule = false): array
    {
        return Appointment::whereHas('client', fn ($query) => $query->where('user_id', $userId))
            ->when($reschedule, fn ($query) => $query->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])->where('date', '>=', now(config('booking.timezone'))->toDateString()))
            ->with(['business', 'branch', 'service', 'professional', 'resource'])->orderByDesc('date')->orderByDesc('start_time')->limit(6)->get()
            ->map(fn ($appointment) => ['type' => 'appointment', 'prepared_action' => $reschedule ? 'review_reschedule' : 'review_booking',
                'checked_at' => now()->toIso8601String(), 'expires_at' => now()->addMinutes(5)->toIso8601String(), 'time' => $appointment->start_time->format('H:i'), 'appointment_id' => $appointment->id, 'status' => $appointment->getRawOriginal('status'),
                'business_id' => $appointment->business_id, 'business_name' => $appointment->business?->name,
                'branch_id' => $appointment->branch_id, 'branch_name' => $appointment->branch?->name, 'address' => $appointment->branch?->address,
                'service_id' => $appointment->service_id, 'service_name' => $appointment->service?->name,
                'price' => (float) $appointment->final_price, 'currency' => $appointment->currency,
                'duration_minutes' => (int) ($appointment->duration_minutes ?? $appointment->service?->duration_minutes),
                'booking_model' => $appointment->booking_model ?? ($appointment->service ? \App\Modules\Booking\Services\BookingRules::model($appointment->service, $appointment->business) : null),
                'resource_id' => $appointment->resource_id, 'resource_name' => $appointment->resource?->name, 'participants' => $appointment->participants ?? 1,
                'professional_id' => $appointment->professional_id, 'professional_name' => $appointment->professional?->name,
                'date' => $appointment->date->toDateString(), 'slots' => [], 'promotion' => null,
                'url' => '/cliente/appointments/'.$appointment->id])->all();
    }
}
