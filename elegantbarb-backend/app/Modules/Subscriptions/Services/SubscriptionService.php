<?php

namespace App\Modules\Subscriptions\Services;

use App\Core\DTOs\ServiceResponse;
use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Finance\Repositories\WalletRepository;
use App\Modules\Subscriptions\Models\Plan;
use App\Modules\Subscriptions\Models\UserSubscription;
use App\Modules\Subscriptions\Repositories\PlanRepository;
use App\Modules\Subscriptions\Repositories\UserSubscriptionRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SubscriptionService
{
    public function __construct(
        private PlanRepository $planRepository,
        private UserSubscriptionRepository $userSubscriptionRepository
    ) {}

    public function getPlans(): ServiceResponse
    {
        return ServiceResponse::success($this->planRepository->getActive(), 'Planes disponibles');
    }

    public function getMySubscription(int $userId): ServiceResponse
    {
        $subscription = $this->userSubscriptionRepository->getActiveByUser($userId);
        return $subscription ? ServiceResponse::success($subscription, 'Suscripción activa') : ServiceResponse::notFound('Suscripción');
    }

    public function subscribe(int $userId, int $planId, array $meta = []): ServiceResponse
    {
        if (! Str::isUuid($meta['idempotency_key'] ?? '') || ! empty($meta['external_subscription_id']) || ! empty($meta['auto_renew'])) {
            return ServiceResponse::error('La solicitud requiere una referencia válida y un pago verificable, sin renovación automática.', null, 422);
        }
        try {
            $subscription = DB::transaction(function () use ($userId, $planId, $meta) {
                User::whereKey($userId)->lockForUpdate()->firstOrFail();
                $reference = 'SUBSCRIPTION:' . $userId . ':' . $meta['idempotency_key'];
                $previous = UserSubscription::where('user_id', $userId)->where('external_subscription_id', $reference)->first();
                if ($previous) {
                    if ($previous->plan_id !== $planId) {
                        throw new \InvalidArgumentException('La referencia corresponde a otro plan.');
                    }
                    return $previous;
                }
                $plan = Plan::whereKey($planId)->where('is_active', true)->lockForUpdate()->first();
                if (! $plan) {
                    throw new \InvalidArgumentException('El plan seleccionado no está disponible.');
                }
                if ($this->userSubscriptionRepository->getActiveByUser($userId)) {
                    throw new \InvalidArgumentException('Ya tienes una suscripción activa.');
                }
                $price = Money::minor($plan->price);
                if ($price === 0 && UserSubscription::where('user_id', $userId)->where('plan_id', $planId)->where('ends_at', '>', now())->exists()) {
                    throw new \InvalidArgumentException('Este plan gratuito ya fue utilizado en el período actual.');
                }
                if ($price > 0 && ($meta['payment_method'] ?? null) !== 'WALLET') {
                    throw new \InvalidArgumentException('Los planes de pago requieren saldo disponible en tu billetera.');
                }
                $startsAt = now();
                $endsAt = match ($plan->billing_cycle) {
                    'MONTHLY' => $startsAt->copy()->addMonthNoOverflow(),
                    'YEARLY', 'ANNUAL' => $startsAt->copy()->addYearNoOverflow(),
                    'WEEKLY' => $startsAt->copy()->addWeek(),
                    default => throw new \InvalidArgumentException('El período de este plan no está configurado.'),
                };
                $subscription = UserSubscription::create([
                    'user_id' => $userId, 'plan_id' => $plan->id, 'status' => 'ACTIVE',
                    'starts_at' => $startsAt, 'ends_at' => $endsAt, 'auto_renew' => false,
                    'credits_remaining' => $plan->credits_per_cycle, 'appointments_used' => 0, 'on_demand_used' => 0,
                    'payment_method' => $price > 0 ? 'WALLET' : 'FREE', 'external_subscription_id' => $reference,
                ]);
                if ($price > 0) {
                    $wallet = app(WalletRepository::class)->getOrCreate($userId);
                    if ($wallet->currency !== $plan->currency) {
                        throw new \InvalidArgumentException('La moneda del plan no coincide con la de tu billetera.');
                    }
                    $wallet->debit($plan->price, [
                        'external_reference' => $reference, 'source_type' => 'SUBSCRIPTION', 'source_id' => $subscription->id,
                        'description' => 'Suscripción: ' . $plan->name,
                    ]);
                }
                return $subscription;
            });
        } catch (\InvalidArgumentException $exception) {
            return ServiceResponse::error($exception->getMessage(), null, 422);
        }
        return ServiceResponse::success($subscription->load('plan'), 'Suscripción activada', 201);
    }

    public function cancel(int $subscriptionId, string $reason, int $userId): ServiceResponse
    {
        $subscription = DB::transaction(function () use ($subscriptionId, $reason, $userId) {
            $subscription = UserSubscription::whereKey($subscriptionId)->where('user_id', $userId)->lockForUpdate()->first();
            if ($subscription && $subscription->status !== 'CANCELLED') {
                $subscription->update(['status' => 'CANCELLED', 'cancelled_at' => now(), 'cancellation_reason' => $reason, 'auto_renew' => false]);
            }
            return $subscription;
        });
        return $subscription ? ServiceResponse::success($subscription, 'Suscripción cancelada') : ServiceResponse::notFound('Suscripción');
    }

    public function consumeCredit(int $userId, string $usageType, array $meta = []): ServiceResponse
    {
        $subscription = $this->userSubscriptionRepository->getActiveByUser($userId);
        if (! $subscription) {
            return ServiceResponse::notFound('Suscripción activa');
        }
        try {
            $usage = $subscription->consumeCredit($usageType, $meta);
        } catch (\RuntimeException|\InvalidArgumentException $exception) {
            return ServiceResponse::error($exception->getMessage(), null, 422);
        }
        return ServiceResponse::success($usage, 'Crédito utilizado');
    }

    public function getUsageHistory(int $userId, int $limit = 50): ServiceResponse
    {
        $usages = \App\Modules\Subscriptions\Models\SubscriptionUsage::whereHas('userSubscription', fn ($subscription) => $subscription->where('user_id', $userId))
            ->orderByDesc('created_at')->orderByDesc('id')->paginate(max(1, min(100, $limit)));
        return ServiceResponse::success($usages, 'Historial de uso');
    }
}
