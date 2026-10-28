<?php

declare(strict_types=1);

namespace Database\Seeders\Demo;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\Service;
use App\Modules\Loyalty\Models\LoyaltyCard;
use App\Modules\Loyalty\Models\LoyaltyProgram;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\People\Models\Client;
use App\Modules\Subscriptions\Models\MembershipPlan;
use App\Modules\Subscriptions\Models\ClientMembership;
use App\Modules\Subscriptions\Services\MembershipService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Additive demo catalog. Never replenishes spent benefits or creates paid subscriptions. */
final class BenefitsDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) throw new \LogicException('Los ejemplos sólo se cargan en local/testing.');
        DB::transaction(function (): void {
            $user = User::where('email', DemoData::CLIENT_EMAIL)->lockForUpdate()->firstOrFail();
            $today = CarbonImmutable::now(config('booking.timezone'));
            foreach ([
                [DemoData::BUSINESS_SLUG, 'ESTILO', 'Cuidado que se nota', 'Tratamiento capilar de cortesía'],
                ['demo-spa-botanico', 'CALMA', 'Tu pausa de bienestar', 'Masaje de manos de cortesía'],
                ['demo-canchas-arena', 'JUEGO', 'Más tiempo en equipo', '30 minutos adicionales de juego'],
            ] as [$slug, $code, $title, $reward]) {
                $business = Business::where('slug', $slug)->lockForUpdate()->firstOrFail();
                $services = Service::where('business_id', $business->id)->where('is_active', true)->orderBy('id')->limit(2)->get();
                if ($services->isEmpty()) throw new \LogicException('El negocio demo requiere servicios activos.');
                $client = Client::firstOrCreate(['user_id' => $user->id, 'business_id' => $business->id], ['name' => $user->name, 'email' => $user->email]);
                foreach ([['15', 'PERCENTAGE', '15.00', '15% en tu próximo plan', '0.00', '30000.00'],
                    ['10K', 'FIXED_AMOUNT', '10000.00', '$10.000 para volver', '30000.00', '10000.00']] as [$suffix, $type, $discount, $offer, $minimum, $maximum]) {
                    $promotion = Promotion::firstOrCreate(['promo_code' => 'BENEFIT-DEMO-'.$code.'-'.$suffix], [
                        'business_id' => $business->id, 'title' => $offer.' · Demo',
                        'description' => 'DEMO: '.$title.'. Aplica a los servicios indicados. No acumulable con membresías u otras promociones.',
                        'type' => $type, 'discount' => $discount, 'min_purchase' => $minimum, 'max_discount' => $maximum,
                        'per_user_limit' => 2, 'usage_limit' => 100, 'usage_count' => 0, 'is_active' => true,
                        'start_date' => $today->startOfDay(), 'end_date' => $today->addDays(60)->endOfDay(),
                    ]);
                    if ($promotion->wasRecentlyCreated) $promotion->services()->sync($services->mapWithKeys(fn (Service $service) => [$service->id => ['discount' => $discount, 'type' => $type]])->all());
                }
                foreach ([['Listo para disfrutar', 4, 4], ['Cada visita cuenta', 6, 2]] as [$name, $required, $stamps]) {
                    $program = LoyaltyProgram::firstOrCreate(['business_id' => $business->id, 'name' => $code.' · '.$name.' · Demo'], [
                        'description' => 'DEMO: acumula un sello al completar el servicio. Canjea el beneficio al completar tu tarjeta.',
                        'type' => 'STAMP', 'service_id' => $services->first()->id, 'stamps_required' => $required,
                        'reward_description' => $reward, 'active' => true, 'valid_until' => $today->addMonths(6)->toDateString(),
                    ]);
                    $card = LoyaltyCard::firstOrCreate(['loyalty_program_id' => $program->id, 'client_id' => $client->id], [
                        'business_id' => $business->id, 'current_stamps' => $stamps, 'total_stamps_ever' => $stamps,
                        'rewards_redeemed' => 0, 'reward_available' => $stamps >= $required, 'status' => 'ACTIVE', 'last_stamp_at' => $today->subDay(),
                    ]);
                    if ($card->wasRecentlyCreated) DB::table('loyalty.loyalty_transactions')->insert([
                        'client_id' => $client->id, 'loyalty_card_id' => $card->id, 'points' => $stamps, 'type' => 'EARN',
                        'description' => 'DEMO: saldo inicial de sellos · '.$program->name, 'created_at' => $today->subDay(),
                    ]);
                }
                foreach ([['descubre', 'Descubre', '0.00', 1, '0.00'], ['plus', 'Plus', '59000.00', 2, '10.00'], ['premium', 'Premium', '89000.00', 3, '15.00']] as [$tier, $name, $price, $visits, $discount]) {
                    $plan = MembershipPlan::firstOrCreate(['business_id' => $business->id, 'slug' => 'benefit-demo-'.strtolower($code).'-'.$tier], [
                        'name' => $code.' '.$name.' · Demo', 'description' => 'DEMO: '.$title.'. Beneficios mensuales, sin renovación automática.',
                        'price' => $price, 'currency' => 'COP', 'billing_cycle' => 'MONTHLY', 'appointments_included' => $visits,
                        'included_services' => $services->pluck('id')->all(), 'discount_percentage' => $discount,
                        'benefits' => [$visits.' servicio(s) incluidos cada mes', $discount === '0.00' ? 'Conoce el negocio sin pago de membresía' : $discount.'% de descuento después de usar los servicios incluidos', 'Válido sólo en los servicios del plan'],
                        'is_active' => true, 'sort_order' => $visits,
                    ]);
                    if ($slug === DemoData::BUSINESS_SLUG && $tier === 'descubre'
                        && ! ClientMembership::where('client_id', $client->id)->where('membership_plan_id', $plan->id)->exists()) {
                        $result = app(MembershipService::class)->subscribeForUser($user->id, $plan->id);
                        if (! $result->success) throw new \LogicException('No se pudo activar el plan gratuito demo.');
                    }
                }
            }
        });
    }
}
