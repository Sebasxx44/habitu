<?php

namespace App\Modules\Marketing\Services;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AvailabilityService;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\Service;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\People\Models\Client;
use App\Modules\Platform\Models\Notification;
use App\Modules\Subscriptions\Models\ClientMembership;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class RetentionRecipeService
{
    public function inspect(Business $business): array
    {
        return ['recipes' => DB::table('marketing.retention_recipes')->where('business_id', $business->id)->orderBy('id')->get(),
            'actions' => DB::table('marketing.retention_actions as action')->join('marketing.retention_recipes as recipe', 'recipe.id', '=', 'action.recipe_id')
                ->leftJoin('marketing.notifications as notification', 'notification.id', '=', 'action.notification_id')->where('recipe.business_id', $business->id)
                ->orderByDesc('action.id')->limit(100)->get(['action.*', 'recipe.kind', 'notification.read'])->map(fn ($row) => [
                    'id' => $row->id, 'kind' => $row->kind, 'state' => $row->state, 'payload' => json_decode($row->payload, true),
                    'expires_at' => CarbonImmutable::parse($row->expires_at)->toIso8601String(), 'promotion_id' => $row->promotion_id, 'read_in_app' => (bool) $row->read, 'clicked' => $row->clicked_at !== null, 'completed_bookings' => app(RetentionAttributionService::class)->completions($row->id),
                ]), 'clinical_marketing_excluded' => $this->restricted($business), 'channel' => 'IN_APP', 'waitlist_connected' => true];
    }

    public function scan(Business $business): int
    {
        $count = 0;
        foreach (DB::table('marketing.retention_recipes')->where('business_id', $business->id)->where('enabled', true)->get() as $recipe) {
            if ($recipe->kind === 'MEMBERSHIP_EXPIRING') {
                $memberships = ClientMembership::with(['client', 'plan'])->whereHas('plan', fn ($q) => $q->where('business_id', $business->id))
                    ->where('status', 'ACTIVE')->where('ends_at', '>', now())->where('ends_at', '<=', now()->addDays($recipe->lead_days))->limit(100)->get();
                foreach ($memberships as $membership) if ($membership->client?->user_id) $count += $this->propose($recipe, $membership->client->user_id,
                    'membership:'.$membership->id.':'.$membership->ends_at->toDateString(), ['membership_id' => $membership->id, 'membership_ends_at' => $membership->ends_at->toIso8601String(), 'title' => 'Tu membresía está próxima a finalizar',
                        'message' => $membership->plan->name.' · '.$membership->ends_at->toDateString().'. Consulta tus consumos y decide si quieres renovar.', 'url' => '/cliente/benefits']);
            } elseif (! $this->restricted($business) && $recipe->kind === 'RETURN_REMINDER') {
                $clients = Client::where('business_id', $business->id)->whereNotNull('user_id')
                    ->whereHas('appointments', fn ($q) => $q->where('status', 'COMPLETED')->where('date', '<', now(config('booking.timezone'))->subDays($recipe->inactive_days)->toDateString()))
                    ->whereDoesntHave('appointments', fn ($q) => $q->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED'])->where('date', '>=', now(config('booking.timezone'))->subDays($recipe->inactive_days)->toDateString()))
                    ->whereIn('user_id', DB::table('marketing.contact_preferences')->where('promotions_enabled', true)->select('user_id'))->limit(100)->get();
                foreach ($clients as $client) $count += $this->propose($recipe, $client->user_id, 'return:'.$client->user_id.':'.intdiv(now()->timestamp, 86400 * $recipe->frequency_days),
                    ['title' => 'Un nuevo momento para ti', 'message' => $business->name.' te invita a consultar los próximos horarios.', 'url' => '/cliente/business/'.$business->id]);
            } elseif (! $this->restricted($business) && $recipe->kind === 'OPEN_SLOTS_PROMOTION') {
                $date = now(config('booking.timezone'))->addDays($recipe->lead_days)->toDateString();
                foreach (Service::where('business_id', $business->id)->where('is_active', true)->limit(10)->get() as $service) {
                    foreach ($business->branches()->where('is_active', true)->limit(5)->get() as $branch) {
                        try { $availability = app(AvailabilityService::class)->slots(['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id, 'date' => $date]); }
                        catch (ValidationException) { continue; }
                        $free = collect($availability['slots'])->where('available', true)->count();
                        if ($free >= 3) $count += $this->propose($recipe, null, 'slots:'.$service->id.':'.$branch->id.':'.$date,
                            ['title' => $service->name, 'service_id' => $service->id, 'branch_id' => $branch->id, 'date' => $date, 'free_start_options' => $free,
                                'source' => 'LIVE_AVAILABILITY', 'historical_occupancy' => null, 'suggested_discount' => $recipe->minimum_discount]);
                    }
                }
            }
        }
        return $count;
    }

    public function run(): int
    {
        $count = 0;
        Business::whereIn('id', DB::table('marketing.retention_recipes')->where('enabled', true)->select('business_id'))->where('is_active', true)->chunkById(25, function ($businesses) use (&$count) {
            foreach ($businesses as $business) $count += $this->scan($business);
        });
        DB::table('marketing.retention_actions')->where('state', 'PROPOSED')->where('expires_at', '<=', now())->update(['state' => 'EXPIRED', 'updated_at' => now()]);
        return $count;
    }

    public function approve(Business $business, User $actor, int $id, ?int $discount): array
    {
        return DB::transaction(function () use ($business, $actor, $id, $discount) {
            $action = DB::table('marketing.retention_actions')->where('id', $id)->lockForUpdate()->first();
            $recipe = $action ? DB::table('marketing.retention_recipes')->where('id', $action->recipe_id)->where('business_id', $business->id)->first() : null;
            abort_unless($recipe, 404);
            if ($action->state !== 'PROPOSED') return ['state' => $action->state];
            abort_unless($recipe->enabled && CarbonImmutable::parse($action->expires_at)->isFuture(), 409, 'La propuesta venció o la receta está pausada.');
            $payload = json_decode($action->payload, true, 512, JSON_THROW_ON_ERROR);
            $updates = ['approved_by' => $actor->id, 'approved_at' => now(), 'updated_at' => now()];
            if ($recipe->kind === 'OPEN_SLOTS_PROMOTION') {
                abort_if($this->restricted($business), 422, 'Esta categoría no permite recetas promocionales.');
                abort_unless($discount !== null && $discount >= $recipe->minimum_discount && $discount <= $recipe->maximum_discount, 422, 'El descuento debe estar dentro de los límites de la receta.');
                $availability = app(AvailabilityService::class)->slots(['business_id' => $business->id, 'branch_id' => $payload['branch_id'], 'service_id' => $payload['service_id'], 'date' => $payload['date']]);
                abort_if(collect($availability['slots'])->where('available', true)->isEmpty(), 409, 'Ya no quedan horarios para esa propuesta.');
                $promotion = Promotion::create(['business_id' => $business->id, 'title' => 'Horarios disponibles · '.$payload['title'],
                    'description' => 'Descuento en el servicio para la fecha indicada. Disponibilidad sujeta a confirmación; no reserva un cupo.',
                    'type' => 'PERCENTAGE', 'discount' => $discount, 'promo_code' => 'VUELVE-'.strtoupper(Str::random(10)),
                    'start_date' => $payload['date'], 'end_date' => $payload['date'], 'usage_limit' => 20, 'per_user_limit' => 1, 'usage_count' => 0, 'is_active' => true]);
                $promotion->services()->attach($payload['service_id']);
                $updates += ['state' => 'PUBLISHED', 'promotion_id' => $promotion->id];
            } else {
                User::whereKey($action->user_id)->lockForUpdate()->firstOrFail();
                $membershipValid = $recipe->kind !== 'MEMBERSHIP_EXPIRING' || ClientMembership::whereKey($payload['membership_id'])
                    ->whereHas('client', fn ($q) => $q->where('user_id', $action->user_id))
                    ->whereHas('plan', fn ($q) => $q->where('business_id', $business->id))
                    ->where('status', 'ACTIVE')->where('ends_at', '>', now())->where('ends_at', '<=', now()->addDays($recipe->lead_days))
                    ->when(isset($payload['membership_ends_at']), fn ($q) => $q->where('ends_at', CarbonImmutable::parse($payload['membership_ends_at'])))->exists();
                $preference = DB::table('marketing.contact_preferences')->where('user_id', $action->user_id)->first();
                $local = now($preference?->timezone ?? config('booking.timezone'));
                $start = substr($preference?->contact_start ?? '09:00', 0, 5); $end = substr($preference?->contact_end ?? '20:00', 0, 5);
                abort_unless($local->format('H:i') >= $start && $local->format('H:i') < $end, 409, 'Fuera de la ventana de contacto elegida por el cliente.');
                $booked = Appointment::where('business_id', $business->id)->whereHas('client', fn ($q) => $q->where('user_id', $action->user_id))
                    ->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])->where('date', '>=', $local->toDateString())->exists();
                $recent = DB::table('marketing.retention_actions as previous')->join('marketing.retention_recipes as recipe', 'recipe.id', '=', 'previous.recipe_id')
                    ->where('recipe.business_id', $business->id)->where('previous.user_id', $action->user_id)->where('previous.state', 'NOTIFIED_IN_APP')
                    ->where('previous.approved_at', '>', now()->subDays($recipe->frequency_days))->exists();
                $suppressed = ! $membershipValid || $booked || $recent || ($recipe->kind === 'RETURN_REMINDER' && (! $preference?->promotions_enabled || $this->restricted($business)));
                if ($suppressed) $updates['state'] = 'SUPPRESSED';
                else {
                    $notification = Notification::create(['user_id' => $action->user_id, 'type' => $recipe->kind, 'title' => $payload['title'], 'message' => $payload['message'],
                        'data' => ['url' => $payload['url'], 'retention_action_id' => $id, 'business_id' => $business->id], 'read' => false]);
                    $updates += ['state' => 'NOTIFIED_IN_APP', 'notification_id' => $notification->id];
                }
            }
            DB::table('marketing.retention_actions')->where('id', $id)->update($updates);
            return ['state' => $updates['state'], 'promotion_id' => $updates['promotion_id'] ?? null];
        });
    }

    private function propose(object $recipe, ?int $userId, string $key, array $payload): int
    {
        return DB::table('marketing.retention_actions')->insertOrIgnore(['recipe_id' => $recipe->id, 'user_id' => $userId, 'dedupe_key' => $recipe->id.':'.$key,
            'payload' => json_encode($payload, JSON_THROW_ON_ERROR), 'state' => 'PROPOSED', 'expires_at' => now()->addDay(), 'created_at' => now(), 'updated_at' => now()]);
    }

    private function restricted(Business $business): bool
    {
        $category = DB::table('platform.business_categories')->where('id', $business->business_category_id)->first();
        return (bool) preg_match('/health|salud|dental|clini|medic|odont|psico|terapia/i', Str::ascii(($category?->slug ?? '').' '.($category?->name ?? '')));
    }
}
