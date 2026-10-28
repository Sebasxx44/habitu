<?php

declare(strict_types=1);

namespace App\Modules\Benefits\Services;

use App\Modules\Loyalty\Models\LoyaltyCard;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\Subscriptions\Models\ClientMembership;
use App\Modules\Subscriptions\Models\MembershipUsage;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class BenefitsAdminAnalyticsService
{
    // QUERIES
    public function summary(int $businessId): array
    {
        $redemptions = DB::table('marketing.promotion_redemptions as r')
            ->join('marketing.promotions as p', 'p.id', '=', 'r.promotion_id')->where('p.business_id', $businessId);
        $memberships = $this->membershipsQuery($businessId);
        $cards = LoyaltyCard::where('business_id', $businessId);
        $vouchers = DB::table('loyalty.reward_vouchers')->where('business_id', $businessId);

        return [
            'promotions' => [
                'redemptions' => (clone $redemptions)->count(),
                'saved_amount' => (float) (clone $redemptions)->sum('r.saved_amount'),
                'unique_clients' => (clone $redemptions)->distinct()->count('r.client_id'),
                'active' => Promotion::where('business_id', $businessId)->activeAndValid()->count(),
            ],
            'memberships' => [
                'active' => (clone $memberships)->where('status', 'ACTIVE')->where('starts_at', '<=', now())->where('ends_at', '>', now())->count(),
                'subscribers' => (clone $memberships)->distinct()->count('client_id'),
                'verified_revenue' => (float) (clone $memberships)->where('payment_reference', 'like', 'WOMPI:MEMBERSHIP:%')
                    ->where('status', '!=', 'SUSPENDED')->sum(DB::raw("COALESCE((plan_snapshot->>'price')::numeric, 0)")),
                'used_appointments' => MembershipUsage::whereHas('clientMembership.plan', fn (Builder $query) => $query->where('business_id', $businessId))
                    ->where('usage_type', 'APPOINTMENT')->whereNull('restored_at')->count(),
            ],
            'loyalty' => [
                'cards' => (clone $cards)->count(),
                'stamps' => (int) (clone $cards)->sum('total_stamps_ever'),
                'rewards_delivered' => (clone $vouchers)->where('status', 'USED')->count(),
                'available_vouchers' => (clone $vouchers)->where('status', 'AVAILABLE')->where('expires_at', '>', now())->count(),
            ],
        ];
    }

    public function memberships(int $businessId): Collection
    {
        return $this->membershipsQuery($businessId)->with('client:id,name', 'plan:id,name')
            ->orderByDesc('created_at')->orderByDesc('id')->limit(50)->get()->map(fn (ClientMembership $membership): array => [
                'id' => $membership->id,
                'status' => $membership->status === 'ACTIVE' && $membership->ends_at->lte(now()) ? 'EXPIRED' : $membership->status,
                'starts_at' => $membership->starts_at->toIso8601String(),
                'ends_at' => $membership->ends_at->toIso8601String(),
                'appointments_used' => $membership->appointments_used,
                'appointments_remaining' => $membership->appointments_remaining,
                'amount_paid' => $this->paidAmount($membership),
                'payment_reference' => $membership->payment_reference,
                'client' => $membership->client?->only(['id', 'name']),
                'plan' => $membership->plan?->only(['id', 'name']),
            ]);
    }

    public function transactions(int $businessId): Collection
    {
        $promotions = DB::table('marketing.promotion_redemptions as r')
            ->join('marketing.promotions as p', 'p.id', '=', 'r.promotion_id')
            ->join('people.clients as c', 'c.id', '=', 'r.client_id')->where('p.business_id', $businessId)
            ->orderByDesc('r.created_at')->orderByDesc('r.id')->limit(50)
            ->get(['r.id', 'r.saved_amount', 'r.appointment_id', 'r.created_at', 'p.title', 'p.promo_code', 'c.name as client_name'])
            ->map(fn (object $entry): array => $this->transaction('promotion', 'promotion-'.$entry->id, $entry->title,
                $entry->client_name, (float) $entry->saved_amount, 'COP', 'REDEEMED', $entry->created_at, $entry->promo_code));
        $memberships = $this->membershipsQuery($businessId)->with('client:id,name', 'plan:id,name')
            ->orderByDesc('created_at')->orderByDesc('id')->limit(50)->get()
            ->map(fn (ClientMembership $entry): array => $this->transaction('membership', 'membership-'.$entry->id,
                'Activación · '.($entry->plan_snapshot['name'] ?? $entry->plan->name), $entry->client->name,
                $this->paidAmount($entry), 'COP', $entry->status, $entry->created_at, $entry->payment_reference));
        $usages = MembershipUsage::with('clientMembership.client:id,name', 'clientMembership.plan:id,name')
            ->whereHas('clientMembership.plan', fn (Builder $query) => $query->where('business_id', $businessId))
            ->orderByDesc('created_at')->orderByDesc('id')->limit(50)->get()
            ->map(fn (MembershipUsage $entry): array => $this->transaction('membership', 'membership-usage-'.$entry->id,
                ($entry->restored_at ? 'Beneficio restituido · ' : 'Beneficio aplicado · ').$entry->clientMembership->plan->name,
                $entry->clientMembership->client->name, (float) $entry->discount_applied, 'COP',
                $entry->restored_at ? 'RESTORED' : 'USED', $entry->restored_at ?? $entry->created_at, 'Reserva #'.$entry->appointment_id));
        $loyalty = DB::table('loyalty.loyalty_transactions as t')
            ->join('loyalty.loyalty_cards as card', 'card.id', '=', 't.loyalty_card_id')
            ->join('people.clients as c', 'c.id', '=', 't.client_id')->where('card.business_id', $businessId)
            ->orderByDesc('t.created_at')->orderByDesc('t.id')->limit(50)
            ->get(['t.id', 't.points', 't.type', 't.description', 't.created_at', 't.appointment_id', 'c.name as client_name'])
            ->map(fn (object $entry): array => $this->transaction('loyalty', 'loyalty-'.$entry->id, $entry->description ?? 'Movimiento de fidelidad',
                $entry->client_name, (float) $entry->points, 'STAMP', $entry->type, $entry->created_at,
                $entry->appointment_id ? 'Reserva #'.$entry->appointment_id : null));
        $deliveries = DB::table('loyalty.reward_vouchers as v')->join('people.clients as c', 'c.id', '=', 'v.client_id')
            ->where('v.business_id', $businessId)->where('v.status', 'USED')->orderByDesc('v.used_at')->orderByDesc('v.id')->limit(50)
            ->get(['v.id', 'v.code', 'v.reward', 'v.used_at', 'c.name as client_name'])
            ->map(fn (object $entry): array => $this->transaction('loyalty', 'voucher-'.$entry->id, 'Premio entregado · '.$entry->reward,
                $entry->client_name, 0, 'STAMP', 'DELIVERED', $entry->used_at, $entry->code));

        return $promotions->concat($memberships)->concat($usages)->concat($loyalty)->concat($deliveries)
            ->sortByDesc('created_at')->groupBy('kind')->flatMap(fn (Collection $entries) => $entries->take(50))
            ->sortByDesc('created_at')->values();
    }

    // NORMALIZATION
    private function membershipsQuery(int $businessId): Builder
    {
        return ClientMembership::whereHas('plan', fn (Builder $query) => $query->where('business_id', $businessId));
    }

    private function paidAmount(ClientMembership $membership): float
    {
        return str_starts_with((string) $membership->payment_reference, 'WOMPI:MEMBERSHIP:')
            ? (float) ($membership->plan_snapshot['price'] ?? 0) : 0.0;
    }

    private function transaction(string $kind, string $id, string $description, string $clientName, float $amount,
        string $unit, string $status, string|\DateTimeInterface $createdAt, ?string $reference): array
    {
        return ['id' => $id, 'kind' => $kind, 'description' => $description, 'client_name' => $clientName,
            'amount' => $amount, 'unit' => $unit, 'status' => $status,
            'created_at' => CarbonImmutable::parse($createdAt, 'UTC')->toIso8601String(), 'reference' => $reference];
    }
}
