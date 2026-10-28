<?php

declare(strict_types=1);

namespace App\Modules\Benefits\Services;

use App\Models\User;
use App\Modules\Loyalty\Models\LoyaltyCard;
use App\Modules\Loyalty\Models\LoyaltyProgram;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\People\Models\Client;
use App\Modules\Subscriptions\Models\ClientMembership;
use App\Modules\Subscriptions\Models\MembershipPlan;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

final class BenefitsCatalogService
{
    public function catalog(User $user, array $filters): array
    {
        $clientIds = Client::where('user_id', $user->id)->pluck('id');
        $cards = LoyaltyCard::whereIn('client_id', $clientIds)->with('program.business:id,name,slug,logo_url')->get();
        $usage = DB::table('marketing.promotion_redemptions')->whereIn('client_id', $clientIds)->selectRaw('promotion_id, count(*) as total')->groupBy('promotion_id')->pluck('total', 'promotion_id');
        $promotions = $this->filter(Promotion::with('business:id,name,slug,logo_url', 'services:id,name,price,duration_minutes')->activeAndValid(), $filters)
            ->orderBy('end_date')->limit(60)->get()->map(function (Promotion $promotion) use ($usage): array {
                $used = (int) ($usage[$promotion->id] ?? 0);
                return ['id' => $promotion->id, 'title' => $promotion->title, 'description' => $promotion->description,
                    'business' => $this->business($promotion->business), 'type' => $promotion->type, 'discount' => (float) $promotion->discount,
                    'code' => $promotion->promo_code, 'starts_at' => $promotion->start_date?->toDateString(), 'expires_at' => $promotion->end_date?->toDateString(),
                    'min_purchase' => (float) ($promotion->min_purchase ?? 0), 'max_discount' => $promotion->max_discount === null ? null : (float) $promotion->max_discount,
                    'remaining_uses' => $promotion->usage_limit === null ? null : max(0, $promotion->usage_limit - $promotion->usage_count),
                    'remaining_for_you' => $promotion->per_user_limit === null ? null : max(0, $promotion->per_user_limit - $used),
                    'eligible' => $promotion->promo_code !== null && ($promotion->per_user_limit === null || $used < $promotion->per_user_limit),
                    'services' => $promotion->services->map(fn ($service) => ['id' => $service->id, 'name' => $service->name,
                        'type' => $service->pivot->type, 'discount' => (float) $service->pivot->discount])->all(),
                    'url' => '/cliente/business/'.$promotion->business_id.'?book=1&promo_code='.urlencode((string) $promotion->promo_code)
                        .($promotion->services->isNotEmpty() ? '&service_id='.$promotion->services->first()->id : '')];
            })->values();
        $today = now(config('booking.timezone'))->toDateString();
        $programs = $this->filter(LoyaltyProgram::with('business:id,name,slug,logo_url', 'service:id,name', 'professional:id,name')
            ->where('active', true)->where('type', 'STAMP')->where(fn ($query) => $query->whereNull('valid_until')->orWhereDate('valid_until', '>=', $today)), $filters)
            ->orderBy('stamps_required')->limit(60)->get()->map(function (LoyaltyProgram $program) use ($cards): array {
                $card = $cards->firstWhere('loyalty_program_id', $program->id);
                return ['id' => $program->id, 'name' => $program->name, 'description' => $program->description,
                    'business' => $this->business($program->business), 'reward' => $program->reward_description, 'required' => $program->stamps_required,
                    'expires_at' => $program->valid_until?->toDateString(), 'service' => $program->service?->only(['id', 'name']),
                    'professional' => $program->professional?->only(['id', 'name']), 'card' => $card ? $this->card($card) : null];
            })->values();
        $plans = $this->filter(MembershipPlan::with('business:id,name,slug,logo_url')->active(), $filters)->orderBy('sort_order')->limit(60)->get();
        $serviceIds = $plans->flatMap(fn ($plan) => $plan->included_services ?? [])->unique()->values();
        $services = \App\Modules\Catalog\Models\Service::whereIn('id', $serviceIds)->get(['id', 'name', 'business_id']);
        foreach ($plans as $plan) $plan->setAttribute('eligible_services', $services->where('business_id', $plan->business_id)->whereIn('id', $plan->included_services ?? [])->map(fn ($service) => $service->only(['id', 'name']))->values());
        $memberships = ClientMembership::whereIn('client_id', $clientIds)->with('plan.business:id,name,slug,logo_url')->orderByDesc('ends_at')->get();
        $vouchers = DB::table('loyalty.reward_vouchers as v')->join('business.businesses as b', 'b.id', '=', 'v.business_id')
            ->whereIn('v.client_id', $clientIds)->select(['v.id', 'v.code', 'v.business_id', 'b.name as business_name', 'v.reward', 'v.status', 'v.expires_at', 'v.used_at'])
            ->orderByDesc('v.created_at')->limit(40)->get()->map(function ($voucher) {
                if ($voucher->status === 'AVAILABLE' && now()->gte($voucher->expires_at)) $voucher->status = 'EXPIRED';
                $voucher->expires_at = \Carbon\CarbonImmutable::parse($voucher->expires_at, 'UTC')->toIso8601String();
                if ($voucher->used_at) $voucher->used_at = \Carbon\CarbonImmutable::parse($voucher->used_at, 'UTC')->toIso8601String();
                return $voucher;
            });
        $history = DB::table('loyalty.loyalty_transactions')->whereIn('client_id', $clientIds)->orderByDesc('created_at')->orderByDesc('id')->limit(50)->get()
            ->map(fn ($entry) => ['id' => $entry->id, 'amount' => $entry->points, 'unit' => $entry->loyalty_card_id ? 'STAMP' : 'POINT', 'description' => $entry->description, 'created_at' => \Carbon\CarbonImmutable::parse($entry->created_at, 'UTC')->toIso8601String()]);
        return ['history' => $history, 'promotions' => $promotions, 'programs' => $programs, 'plans' => $plans,
            'memberships' => $memberships, 'vouchers' => $vouchers,
            'summary' => ['points' => (int) Client::whereIn('id', $clientIds)->sum('loyalty_points'),
                'cards' => $cards->count(), 'ready_rewards' => $cards->filter(fn ($card) => $this->card($card)['available'])->count(),
                'active_memberships' => $memberships->filter(fn ($membership) => $membership->isActive())->count(),
                'available_vouchers' => $vouchers->where('status', 'AVAILABLE')->count()],
            'rules' => ['stacking' => false, 'loyalty_earning' => 'COMPLETED_APPOINTMENT', 'voucher_validity_days' => 30]];
    }

    private function filter(Builder $query, array $filters): Builder
    {
        return $query->whereHas('business', fn ($business) => $business->where('is_active', true)
            ->when($filters['q'] ?? null, fn ($search, $text) => $search->where('name', 'ilike', '%'.$text.'%'))
            ->when($filters['business_id'] ?? null, fn ($search, $id) => $search->whereKey($id))
            ->when($filters['category_id'] ?? null, fn ($search, $id) => $search->where('business_category_id', $id)));
    }

    private function business($business): array
    {
        return ['id' => $business->id, 'name' => $business->name, 'slug' => $business->slug, 'logo_url' => $business->logo_url, 'currency' => $business->currency ?? 'COP'];
    }

    private function card(LoyaltyCard $card): array
    {
        $program = $card->program;
        $valid = $program && $program->active && (! $program->valid_until || $program->valid_until->toDateString() >= now(config('booking.timezone'))->toDateString());
        return ['id' => $card->id, 'stamps' => $card->current_stamps, 'required' => $program?->stamps_required ?? 0,
            'available' => $valid && $card->status === 'ACTIVE' && $card->reward_available && $card->current_stamps >= $program->stamps_required,
            'status' => $valid ? $card->status : 'EXPIRED'];
    }
}
