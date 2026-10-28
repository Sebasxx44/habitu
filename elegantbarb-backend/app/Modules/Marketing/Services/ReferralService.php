<?php

namespace App\Modules\Marketing\Services;

use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Marketing\Models\Promotion;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ReferralService
{
    public function summary(User $user): array
    {
        $code = DB::transaction(function () use ($user) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            DB::table('marketing.referral_codes')->insertOrIgnore(['user_id' => $user->id, 'code' => 'HABITU-'.strtoupper(Str::random(12)), 'created_at' => now(), 'updated_at' => now()]);
            return DB::table('marketing.referral_codes')->where('user_id', $user->id)->value('code');
        });
        $attributions = DB::table('marketing.referral_attributions')->where('referrer_id', $user->id);
        return ['code' => $code, 'attributed' => (clone $attributions)->count(), 'qualified' => (clone $attributions)->where('status', 'QUALIFIED')->count(),
            'applied' => DB::table('marketing.referral_attributions')->where('referred_id', $user->id)->exists(),
            'rewards' => DB::table('marketing.referral_rewards as reward')->join('marketing.promotions as promotion', 'promotion.id', '=', 'reward.promotion_id')
                ->where('reward.user_id', $user->id)->orderByDesc('reward.id')->limit(50)->get(['reward.id', 'reward.status', 'reward.currency', 'reward.amount_minor', 'promotion.promo_code', 'promotion.end_date', 'promotion.business_id'])->all(),
            'programs' => DB::table('marketing.referral_programs')->where('enabled', true)->get(['business_id', 'reward_minor', 'currency', 'minimum_paid_minor', 'validity_days', 'qualification_days', 'terms'])->all()];
    }

    public function attribute(User $user, string $code): void
    {
        DB::transaction(function () use ($user, $code) {
            $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $owner = DB::table('marketing.referral_codes')->where('code', strtoupper(trim($code)))->first();
            abort_unless($owner && $owner->user_id !== $user->id, 422, 'Código no elegible.');
            $existing = DB::table('marketing.referral_attributions')->where('referred_id', $user->id)->first();
            if ($existing) { abort_unless($existing->referrer_id === $owner->user_id, 409, 'Ya existe una atribución para esta cuenta.'); return; }
            abort_if($user->created_at->lt(now()->subDays(30)) || Appointment::whereHas('client', fn ($q) => $q->where('user_id', $user->id))->exists(), 422, 'El código debe aplicarse antes de la primera reserva y dentro de los primeros 30 días.');
            DB::table('marketing.referral_attributions')->insert(['referrer_id' => $owner->user_id, 'referred_id' => $user->id, 'status' => 'ATTRIBUTED', 'created_at' => now(), 'updated_at' => now()]);
        });
    }

    public function process(): int
    {
        $count = 0;
        DB::table('marketing.referral_attributions')->whereIn('status', ['ATTRIBUTED', 'QUALIFIED'])->orderBy('id')->chunkById(100, function ($items) use (&$count) {
            foreach ($items as $item) { $this->evaluate($item->id); $count++; }
        });
        return $count;
    }

    public function evaluate(int $id): void
    {
        DB::transaction(function () use ($id) {
            $attribution = DB::table('marketing.referral_attributions')->where('id', $id)->lockForUpdate()->first();
            if (! $attribution || $attribution->status === 'REVERSED') return;
            $appointment = $attribution->appointment_id ? Appointment::find($attribution->appointment_id)
                : Appointment::whereHas('client', fn ($q) => $q->where('user_id', $attribution->referred_id))->where('status', 'COMPLETED')
                    ->where(fn ($query) => $query->whereNull('source')->orWhereNotIn(DB::raw('LOWER(source)'), ['demo', 'test']))
                    ->whereNotExists(fn ($query) => $query->selectRaw('1')->from('finance.checkout_orders as sandbox')->whereColumn('sandbox.target_id', 'booking.appointments.id')->where('sandbox.purpose', 'reservation')->where('sandbox.environment', 'test'))
                    ->orderBy('completed_at')->orderBy('id')->first();
            if (! $appointment) return;
            $refunded = in_array($appointment->payment_status, ['REFUNDED', 'REFUND_PENDING'], true)
                || DB::table('finance.payments')->where('appointment_id', $appointment->id)->whereIn('status', ['REFUNDED', 'PARTIALLY_REFUNDED'])->exists()
                || DB::table('finance.checkout_refunds as refund')->join('finance.checkout_orders as checkout', 'checkout.id', '=', 'refund.checkout_order_id')
                    ->where('checkout.purpose', 'reservation')->where('checkout.target_id', $appointment->id)->whereIn('refund.status', ['REQUESTED', 'PROCESSING', 'COMPLETED'])->exists();
            if ($attribution->status === 'QUALIFIED') {
                if ($refunded || $appointment->getRawOriginal('status') !== 'COMPLETED') {
                    $rewards = DB::table('marketing.referral_rewards')->where('attribution_id', $id)->get();
                    Promotion::whereIn('id', $rewards->pluck('promotion_id'))->update(['is_active' => false]);
                    DB::table('marketing.referral_rewards')->where('attribution_id', $id)->update(['status' => 'REVERSED', 'updated_at' => now()]);
                    DB::table('marketing.referral_attributions')->where('id', $id)->update(['status' => 'REVERSED', 'reversed_at' => now(), 'updated_at' => now()]);
                }
                return;
            }
            if ($refunded || $appointment->payment_status !== 'PAID' || Money::minor($appointment->final_price) === 0) return;
            $paid = Money::minor(DB::table('finance.payments')->where('appointment_id', $appointment->id)->where('status', 'COMPLETED')->where('currency', $appointment->currency)->sum('amount'));
            if ($paid < Money::minor($appointment->final_price)) return;
            DB::table('marketing.referral_attributions')->where('id', $id)->update(['status' => 'QUALIFIED', 'appointment_id' => $appointment->id, 'qualified_at' => now(), 'updated_at' => now()]);
            $program = DB::table('marketing.referral_programs')->where('business_id', $appointment->business_id)->where('enabled', true)->first();
            if (! $program || $program->currency !== $appointment->currency || $paid < $program->minimum_paid_minor || $program->reward_minor <= 0
                || CarbonImmutable::parse($attribution->created_at)->addDays($program->qualification_days)->lt($appointment->completed_at ?? now())) return;
            foreach ([$attribution->referrer_id, $attribution->referred_id] as $userId) {
                $promotion = Promotion::create(['business_id' => $appointment->business_id, 'title' => 'Beneficio por referido', 'description' => $program->terms,
                    'type' => 'FIXED_AMOUNT', 'discount' => Money::decimal($program->reward_minor), 'promo_code' => 'REF-'.strtoupper(Str::random(16)),
                    'start_date' => now(), 'end_date' => now()->addDays($program->validity_days), 'usage_limit' => 1, 'per_user_limit' => 1, 'usage_count' => 0, 'is_active' => true]);
                DB::table('marketing.referral_rewards')->insert(['attribution_id' => $id, 'user_id' => $userId, 'promotion_id' => $promotion->id,
                    'amount_minor' => $program->reward_minor, 'currency' => $program->currency, 'status' => 'ISSUED',
                    'terms_snapshot' => json_encode(['terms' => $program->terms, 'validity_days' => $program->validity_days, 'qualifying_appointment' => $appointment->id]), 'created_at' => now(), 'updated_at' => now()]);
            }
        });
    }

    public function canUseReward(int $promotionId, ?int $userId): bool
    {
        $reward = DB::table('marketing.referral_rewards')->where('promotion_id', $promotionId)->first();
        return ! $reward || ($userId && $reward->user_id === $userId && $reward->status === 'ISSUED');
    }
}
