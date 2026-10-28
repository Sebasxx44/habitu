<?php

namespace App\Console\Commands\Subscriptions;

use App\Models\Notification;
use App\Modules\Finance\Models\Wallet;
use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Subscriptions\Models\UserSubscription;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ProcessRenewals extends Command
{
    protected $signature = 'subscriptions:process-renewals';

    protected $description = 'Procesa renovaciones automáticas de suscripciones activas';

    public function handle(): int
    {
        try {
            $subscriptions = UserSubscription::with('plan')
                ->where('auto_renew', true)
                ->where('status', 'ACTIVE')
                ->where('ends_at', '<', now()->addHours(24))
                ->get();

            if ($subscriptions->isEmpty()) {
                $this->info('No hay suscripciones para renovar.');
                return self::SUCCESS;
            }

            $count = 0;

            foreach ($subscriptions as $candidate) {
                DB::transaction(function () use ($candidate, &$count): void {
                    User::whereKey($candidate->user_id)->lockForUpdate()->firstOrFail();
                    $subscription = UserSubscription::whereKey($candidate->id)->lockForUpdate()->first();
                    if (! $subscription || ! $subscription->auto_renew || $subscription->status !== 'ACTIVE'
                        || ! $subscription->ends_at->lt(now()->addHours(24))) return;
                    $plan = $subscription->plan;
                    if (! $plan) return;
                    $user = $subscription->user;
                    $wallet = Wallet::where('user_id', $subscription->user_id)->lockForUpdate()->first();
                    $price = Money::minor($plan->price);
                    $period = $subscription->ends_at->copy();
                    $nextPeriod = match ($plan->billing_cycle) {
                        'WEEKLY' => $period->copy()->addWeek(),
                        'MONTHLY' => $period->copy()->addMonthNoOverflow(),
                        'YEARLY', 'ANNUAL' => $period->copy()->addYearNoOverflow(),
                        default => throw new \InvalidArgumentException('El período del plan no está configurado.'),
                    };
                    $canPay = $wallet && $wallet->is_active && $wallet->currency === $plan->currency
                        && Money::minor($wallet->balance) - Money::minor($wallet->hold_balance) >= $price;
                    if ($price === 0 || $canPay) {
                        if ($price > 0) $wallet->debit(Money::decimal($price), [
                            'external_reference' => 'SUBSCRIPTION_RENEWAL:'.$subscription->id.':'.$period->utc()->format('YmdHis'),
                            'description' => 'Renovación automática de suscripción: '.$plan->name,
                            'source_type' => UserSubscription::class, 'source_id' => $subscription->id,
                        ]);
                        $subscription->update([
                            'ends_at' => $nextPeriod, 'credits_remaining' => $plan->credits_per_cycle,
                            'appointments_used' => 0, 'on_demand_used' => 0, 'status' => 'ACTIVE',
                        ]);
                    } else {
                        $subscription->update(['status' => 'PENDING_PAYMENT']);
                        if ($user) Notification::create([
                            'user_id' => $user->id, 'title' => 'Pago de renovación pendiente',
                            'message' => 'No pudimos renovar tu suscripción "'.$plan->name.'". Revisa el saldo disponible y el estado de tu billetera.',
                            'type' => 'SUBSCRIPTION_RENEWAL_FAILED',
                        ]);
                    }
                    $count++;
                }, 3);
            }

            $this->info("{$count} suscripciones procesadas para renovación.");
            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Error al procesar renovaciones: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
