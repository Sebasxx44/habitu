<?php

namespace Database\Seeders\Demo;

use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Finance\Models\Wallet;
use App\Modules\Finance\Models\WalletTransaction;
use App\Modules\Finance\Repositories\WalletRepository;
use App\Modules\Loyalty\Models\LoyaltyCard;
use App\Modules\Loyalty\Models\LoyaltyProgram;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Modules\Subscriptions\Models\ClientMembership;
use App\Modules\Subscriptions\Models\MembershipPlan;
use App\Modules\Subscriptions\Models\Plan;
use App\Modules\Subscriptions\Models\UserSubscription;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Demo fixtures only. Replays never replenish balances, points or redeemed rewards. */
class DemoCommerceSeeder extends Seeder
{
    private const BUSINESS_SLUGS = [DemoData::BUSINESS_SLUG, 'demo-spa-botanico', 'demo-canchas-arena'];

    public function run(): void
    {
        Model::withoutEvents(fn () => DB::transaction(function (): void {
            $business = Business::where('slug', DemoData::BUSINESS_SLUG)->lockForUpdate()->firstOrFail();
            $users = User::whereIn('email', [DemoData::SUPERADMIN_EMAIL, DemoData::ADMIN_EMAIL, DemoData::PROFESSIONAL_EMAIL, DemoData::CLIENT_EMAIL])
                ->orderBy('id')->lockForUpdate()->get()->keyBy('email');
            if ($users->count() !== 4) throw new \LogicException('Ejecuta DemoCatalogSeeder antes de DemoCommerceSeeder.');
            $client = Client::where('user_id', $users[DemoData::CLIENT_EMAIL]->id)->lockForUpdate()->firstOrFail();
            $professional = Professional::where('user_id', $users[DemoData::PROFESSIONAL_EMAIL]->id)->firstOrFail();
            $now = CarbonImmutable::now(config('booking.timezone', 'America/Bogota'));
            $appointments = Appointment::whereIn('business_id', Business::whereIn('slug', self::BUSINESS_SLUGS)->select('id'))
                ->where('notes', 'like', 'DEMO: cita de demostración %')->where('booking_code', 'like', 'DEMO-B%')
                ->orderBy('date')->orderBy('start_time')->get();
            $recent = $appointments->filter(fn (Appointment $appointment) => $appointment->client_id === $client->id
                && $appointment->getRawOriginal('status') === 'COMPLETED' && $appointment->date->toDateString() >= $now->subDays(20)->toDateString()
                && $appointment->date->toDateString() < $now->toDateString())->values();

            $wallets = $users->map(fn (User $user) => app(WalletRepository::class)->getOrCreate($user->id));
            foreach ($wallets as $wallet) {
                if ($wallet->currency !== 'COP' || ! $wallet->is_active) throw new \LogicException('Las billeteras demo deben estar activas en COP.');
            }
            foreach ([DemoData::SUPERADMIN_EMAIL, DemoData::ADMIN_EMAIL] as $email) {
                $this->dated($wallets[$email]->credit('500000.00', [
                    'external_reference' => 'DEMO:OPENING:' . $email, 'description' => 'DEMO: saldo de demostración', 'source_type' => 'DEMO',
                ]), $now->subDays(30));
            }
            $clientWallet = $wallets[DemoData::CLIENT_EMAIL];
            $this->topup($clientWallet, '600000.00', 'DEMO:TOPUP:CLIENT:1', $now->subDays(30));
            $this->topup($clientWallet, '400000.00', 'DEMO:TOPUP:CLIENT:2', $now->subDays(22));
            $this->subscriptions($client, $clientWallet, $recent, $now);
            $this->payments($appointments, $recent->take(2)->pluck('id')->all(), $clientWallet, $now);
            $this->dated($clientWallet->cashback('5000.00', ['external_reference' => 'DEMO:CASHBACK:CLIENT',
                'source_type' => 'DEMO', 'description' => 'DEMO: bonificación de bienvenida']), $now->subHour());
            $this->professionalEarnings($business, $professional, $users[DemoData::ADMIN_EMAIL], $wallets[DemoData::PROFESSIONAL_EMAIL], $now);
            $this->loyalty($business, $professional, $client, $now);
            $this->memberships($business, $client, $recent, $now);
            $this->pendingFinance($client, $appointments, $now);
            $this->expenses($now);
        }));
    }

    private function topup(Wallet $wallet, string $amount, string $reference, CarbonImmutable $when): void
    {
        $row = $this->row('finance.wallet_topups', ['user_id' => $wallet->user_id, 'external_reference' => $reference], [
            'amount' => $amount, 'status' => 'COMPLETED', 'payment_id' => $reference, 'created_at' => $when, 'updated_at' => $when,
        ]);
        $this->dated($wallet->credit($amount, ['external_reference' => $reference, 'source_type' => 'WALLET_TOPUP', 'source_id' => $row->id,
            'payment_method' => 'DEMO', 'description' => 'DEMO: recarga local sin pasarela externa']), $when);
    }

    private function payments(Collection $appointments, array $walletIds, Wallet $clientWallet, CarbonImmutable $now): void
    {
        foreach ($appointments as $appointment) {
            if ($appointment->getRawOriginal('status') !== 'COMPLETED') continue;
            $reference = 'DEMO:PAYMENT:' . $appointment->booking_code;
            if (DB::table('finance.payments')->where('appointment_id', $appointment->id)->where(fn ($query) => $query
                ->whereNull('external_reference')->orWhere('external_reference', 'not like', 'DEMO:%'))->exists()) continue;
            $method = in_array($appointment->id, $walletIds, true) ? 'WALLET' : ($appointment->id % 2 === 0 ? 'CASH' : 'PSE');
            $when = CarbonImmutable::parse($appointment->date->toDateString() . ' ' . substr($appointment->getRawOriginal('end_time'), 0, 8), $now->timezone);
            $this->row('finance.payments', ['external_reference' => $reference], [
                'appointment_id' => $appointment->id, 'client_id' => $appointment->client_id, 'business_id' => $appointment->business_id,
                'amount' => $appointment->final_price, 'currency' => 'COP', 'method' => $method, 'status' => 'COMPLETED',
                'external_transaction_id' => $reference, 'gateway_response' => json_encode(['demo' => true, 'external_charge' => false]),
                'paid_at' => $when, 'created_at' => $when, 'updated_at' => $when,
            ]);
            if ($method === 'WALLET') {
                $this->dated($clientWallet->debit($appointment->final_price, ['external_reference' => $reference,
                    'source_type' => 'APPOINTMENT', 'source_id' => $appointment->id, 'payment_method' => 'WALLET',
                    'description' => 'DEMO: pago de cita ' . $appointment->booking_code]), $when);
            }
            if ($appointment->payment_status === 'PENDING') $appointment->update(['payment_status' => 'PAID']);
        }
    }

    private function professionalEarnings(Business $business, Professional $professional, User $admin, Wallet $wallet, CarbonImmutable $now): void
    {
        $events = [
            ['type' => 'PAYOUT', 'key' => '1', 'amount' => '185000.00', 'when' => $now->subDays(12)],
            ['type' => 'PAYOUT', 'key' => '2', 'amount' => '225000.00', 'when' => $now->subDays(3)],
            ['type' => 'WITHDRAWAL', 'key' => '1', 'amount' => '80000.00', 'when' => $now->subDays(2), 'status' => 'COMPLETED'],
            ['type' => 'PAYOUT', 'key' => '3', 'amount' => '145000.00', 'when' => $now->subHours(3)],
            ['type' => 'WITHDRAWAL', 'key' => '2', 'amount' => '35000.00', 'when' => $now->subHour(), 'status' => 'PENDING'],
        ];
        foreach ($events as $event) {
            $reference = 'DEMO:' . $event['type'] . ':PROFESSIONAL:' . $event['key'];
            $when = $event['when'];
            if ($event['type'] === 'PAYOUT') {
                $row = $this->row('finance.professional_payouts', ['professional_id' => $professional->id, 'notes' => $reference], [
                    'business_id' => $business->id, 'amount' => $event['amount'], 'period_start' => $when->subDays(6)->toDateString(),
                    'period_end' => $when->toDateString(), 'status' => 'PAID', 'paid_at' => $when, 'paid_by' => $admin->id,
                    'created_at' => $when, 'updated_at' => $when,
                ]);
                $transaction = $wallet->payout($event['amount'], ['external_reference' => $reference, 'source_type' => 'PROFESSIONAL_PAYOUT',
                    'source_id' => $row->id, 'description' => 'DEMO: liquidación profesional ' . $event['key']]);
            } else {
                $row = $this->row('finance.withdrawals', ['user_id' => $wallet->user_id, 'bank_account' => 'DEMO-NO-TRANSFER-' . $event['key']], [
                    'amount' => $event['amount'], 'bank_name' => 'Banco de demostración', 'status' => $event['status'],
                    'processed_at' => $event['status'] === 'COMPLETED' ? $when : null, 'created_at' => $when, 'updated_at' => $when,
                ]);
                $transaction = $wallet->debit($event['amount'], ['external_reference' => $reference, 'source_type' => 'WITHDRAWAL',
                    'source_id' => $row->id, 'description' => 'DEMO: solicitud de retiro ' . $event['key']]);
            }
            $this->dated($transaction, $when);
        }
    }

    private function subscriptions(Client $client, Wallet $wallet, Collection $recent, CarbonImmutable $now): void
    {
        $plans = [];
        foreach ([['explora', 'Explora Demo', '0.00', 3], ['plus', 'Plus Demo', '49900.00', 6], ['premium', 'Premium Demo', '99900.00', 12]] as [$slug, $name, $price, $credits]) {
            $plans[$slug] = Plan::firstOrCreate(['slug' => 'demo-' . $slug], [
                'name' => $name, 'description' => 'Plan de demostración para explorar la plataforma.', 'billing_cycle' => 'MONTHLY',
                'price' => $price, 'currency' => 'COP', 'credits_per_cycle' => $credits, 'max_appointments_per_cycle' => $credits,
                'max_on_demand_per_cycle' => 2, 'discount_percentage' => 0, 'features' => ['Créditos para citas', 'Historial de consumo'], 'is_active' => true,
            ]);
        }
        $reference = 'DEMO:SUBSCRIPTION:CLIENT:PLUS';
        $usages = $recent->take(2);
        $subscription = UserSubscription::firstOrCreate(['user_id' => $client->user_id, 'external_subscription_id' => $reference], [
            'plan_id' => $plans['plus']->id, 'status' => 'ACTIVE', 'starts_at' => $now->subDays(21), 'ends_at' => $now->addDays(9),
            'auto_renew' => false, 'credits_remaining' => 6 - $usages->count(), 'appointments_used' => $usages->count(), 'on_demand_used' => 0, 'payment_method' => 'WALLET',
        ]);
        $this->dated($wallet->debit('49900.00', ['external_reference' => $reference, 'source_type' => 'SUBSCRIPTION',
            'source_id' => $subscription->id, 'description' => 'DEMO: suscripción Plus']), $now->subDays(21));
        foreach ($usages as $appointment) {
            $this->row('subscriptions.subscription_usages', ['user_subscription_id' => $subscription->id,
                'source_id' => $appointment->id, 'source_type' => 'APPOINTMENT'], [
                'usage_type' => 'APPOINTMENT', 'credits_used' => 1, 'discount_applied' => 0,
                'description' => 'DEMO: crédito utilizado en ' . $appointment->booking_code,
                'created_at' => $appointment->date, 'updated_at' => $appointment->date,
            ]);
        }
    }

    private function loyalty(Business $business, Professional $professional, Client $client, CarbonImmutable $now): void
    {
        foreach ([['Ritual de cuidado Demo', 5, 5, 0], ['Estilo frecuente Demo', 8, 8, 0], ['Visitas y detalles Demo', 5, 2, 1]] as [$name, $required, $stamps, $redeemed]) {
            $program = LoyaltyProgram::firstOrCreate(['business_id' => $business->id, 'name' => $name], [
                'description' => 'DEMO: programa de sellos para probar recompensas.', 'type' => 'STAMP', 'stamps_required' => $required,
                'reward_description' => $required === 8 ? 'Masaje capilar de cortesía' : 'Tratamiento de cuidado de cortesía',
                'active' => true, 'valid_until' => $now->addMonths(6)->toDateString(), 'professional_id' => $professional->id,
            ]);
            $card = LoyaltyCard::firstOrCreate(['loyalty_program_id' => $program->id, 'client_id' => $client->id], [
                'business_id' => $business->id, 'current_stamps' => $stamps, 'total_stamps_ever' => $stamps + $redeemed * $required,
                'rewards_redeemed' => $redeemed, 'reward_available' => $stamps >= $required, 'status' => 'ACTIVE', 'last_stamp_at' => $now->subDay(),
            ]);
            $this->row('loyalty.loyalty_transactions', ['client_id' => $client->id, 'loyalty_card_id' => $card->id, 'description' => 'DEMO: sellos acumulados · ' . $name], [
                'points' => $stamps + $redeemed * $required, 'type' => 'EARN', 'created_at' => $now->subDays(8),
            ], false);
            if ($redeemed) $this->row('loyalty.loyalty_transactions', ['client_id' => $client->id, 'loyalty_card_id' => $card->id, 'description' => 'DEMO: canje anterior · ' . $name], [
                'points' => -$required, 'type' => 'REDEEM', 'created_at' => $now->subDays(3),
            ], false);
        }
        foreach ([[180, 'bienvenida', 20], [120, 'visitas', 10], [-50, 'beneficio', 4]] as [$points, $reason, $days]) {
            $identity = ['client_id' => $client->id, 'description' => 'DEMO: puntos por ' . $reason];
            if (! DB::table('loyalty.loyalty_transactions')->where($identity)->exists()) {
                $this->row('loyalty.loyalty_transactions', $identity, ['points' => $points,
                    'type' => $points > 0 ? 'EARN' : 'REDEEM', 'created_at' => $now->subDays($days)], false);
                $client->increment('loyalty_points', $points);
            }
        }
    }

    private function memberships(Business $business, Client $client, Collection $recent, CarbonImmutable $now): void
    {
        $starter = MembershipPlan::firstOrCreate(['business_id' => $business->id, 'slug' => 'demo-bienvenida'], [
            'name' => 'Bienvenida Demo', 'description' => 'Membresía gratuita de demostración.', 'price' => 0, 'currency' => 'COP',
            'billing_cycle' => 'MONTHLY', 'appointments_included' => 4, 'discount_percentage' => 0,
            'benefits' => ['Cuatro citas incluidas', 'Historial de visitas'], 'is_active' => true,
        ]);
        foreach ([['demo-descubre', 'Descubre Demo', 0, 2], ['demo-cuidado-plus', 'Cuidado Plus Demo', 59000, 6]] as [$slug, $name, $price, $appointments]) {
            MembershipPlan::firstOrCreate(['business_id' => $business->id, 'slug' => $slug], [
                'name' => $name, 'description' => 'DEMO: catálogo de membresías del negocio.', 'price' => $price, 'currency' => 'COP',
                'billing_cycle' => 'MONTHLY', 'appointments_included' => $appointments, 'discount_percentage' => 0,
                'benefits' => [$appointments . ' citas incluidas'], 'is_active' => true,
            ]);
        }
        $appointment = $recent->last();
        $membership = ClientMembership::firstOrCreate(['client_id' => $client->id, 'membership_plan_id' => $starter->id], [
            'status' => 'ACTIVE', 'starts_at' => $now->subDays(21), 'ends_at' => $now->addDays(9),
            'appointments_used' => $appointment ? 1 : 0, 'appointments_remaining' => $appointment ? 3 : 4, 'auto_renew' => false,
        ]);
        if ($appointment) $this->row('subscriptions.membership_usage', ['client_membership_id' => $membership->id, 'appointment_id' => $appointment->id], [
            'usage_type' => 'APPOINTMENT', 'discount_applied' => 0, 'created_at' => $appointment->date, 'updated_at' => $appointment->date,
        ]);
    }

    private function pendingFinance(Client $client, Collection $appointments, CarbonImmutable $now): void
    {
        $upcoming = $appointments->filter(fn (Appointment $appointment) => $appointment->client_id === $client->id
            && in_array($appointment->getRawOriginal('status'), ['PENDING', 'CONFIRMED'], true)
            && $appointment->date->toDateString() >= $now->toDateString())->values();
        if ($appointment = $upcoming->first()) {
            $application = $this->row('finance.bnpl_applications', ['provider_reference' => 'DEMO:BNPL:' . $appointment->booking_code], [
                'client_id' => $client->id, 'appointment_id' => $appointment->id, 'total_amount' => $appointment->final_price,
                'installments_count' => 3, 'interest_rate' => 0, 'status' => 'PENDING', 'provider' => 'INTERNAL',
            ]);
            $total = Money::minor($appointment->final_price);
            for ($index = 1; $index <= 3; $index++) {
                $amount = intdiv($total, 3) + ($index === 3 ? $total % 3 : 0);
                $this->row('finance.bnpl_installments', ['bnpl_application_id' => $application->id, 'installment_number' => $index], [
                    'amount' => Money::decimal($amount), 'due_date' => $now->addMonths($index - 1)->addDays(7)->toDateString(), 'status' => 'PENDING',
                ]);
            }
        }
        if ($appointment = $upcoming->get(1)) {
            $other = Client::where('business_id', $client->business_id)->where('id', '!=', $client->id)
                ->whereHas('user', fn ($user) => $user->where('email', 'like', '%@elegantbarb.test'))->whereNotNull('user_id')->first();
            if (! $other) return;
            $split = $this->row('finance.split_payments', ['appointment_id' => $appointment->id], [
                'total_amount' => $appointment->final_price, 'split_count' => 2, 'status' => 'PENDING',
            ]);
            $total = Money::minor($appointment->final_price);
            foreach ([$client->user_id, $other->user_id] as $index => $userId) {
                $this->row('finance.split_payment_participants', ['split_payment_id' => $split->id, 'user_id' => $userId], [
                    'amount' => Money::decimal(intdiv($total, 2) + ($index === 1 ? $total % 2 : 0)), 'status' => 'PENDING',
                ]);
            }
        }
    }

    private function expenses(CarbonImmutable $now): void
    {
        foreach (Business::whereIn('slug', self::BUSINESS_SLUGS)->get() as $business) {
            foreach ([['RENT', 'uso del local', '350000.00', 17], ['PRODUCTS', 'insumos de atención', '85000.00', 8], ['MARKETING', 'campaña local', '45000.00', 3]] as [$category, $label, $amount, $days]) {
                $this->row('finance.expenses', ['business_id' => $business->id, 'description' => 'DEMO: ' . $label], [
                    'branch_id' => $business->branches()->where('is_main_branch', true)->value('id'), 'amount' => $amount,
                    'category' => $category, 'date' => $now->subDays($days)->toDateString(),
                ]);
            }
        }
    }

    private function dated(WalletTransaction $transaction, CarbonImmutable $when): void
    {
        if ($transaction->wasRecentlyCreated) $transaction->update(['created_at' => $when, 'updated_at' => $when]);
    }

    private function row(string $table, array $identity, array $values, bool $timestamps = true): object
    {
        $query = DB::table($table)->where($identity);
        if ($existing = $query->first()) return $existing;
        if ($timestamps) $values += ['created_at' => now(), 'updated_at' => now()];
        $id = DB::table($table)->insertGetId([...$identity, ...$values]);
        return DB::table($table)->where('id', $id)->firstOrFail();
    }
}
