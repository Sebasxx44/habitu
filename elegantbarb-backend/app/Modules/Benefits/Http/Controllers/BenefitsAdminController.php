<?php

declare(strict_types=1);

namespace App\Modules\Benefits\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Benefits\Services\BenefitsAdminAnalyticsService;
use App\Modules\Benefits\Services\LoyaltyBenefitService;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\Service;
use App\Modules\Loyalty\Models\LoyaltyProgram;
use App\Modules\Marketing\Http\Controllers\PromotionController;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\People\Models\Professional;
use App\Modules\Subscriptions\Models\MembershipPlan;
use App\Services\BusinessAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class BenefitsAdminController extends Controller
{
    public function index(Request $request, BenefitsAdminAnalyticsService $analytics): JsonResponse
    {
        $request->validate(['business_id' => 'nullable|integer|min:1', 'cards_page' => 'nullable|integer|min:1']);
        $businesses = Business::query()->when($request->user()->role !== User::ROLE_SUPERADMIN,
            fn ($query) => $query->whereIn('id', app(BusinessAccessService::class)->businessIds($request->user())))
            ->orderBy('name')->get(['id', 'name']);
        $id = (int) ($request->input('business_id') ?: $businesses->first()?->id);
        abort_unless($businesses->contains('id', $id), 403);
        return ServiceResponse::success(['businesses' => $businesses, 'business_id' => $id,
            'analytics' => $analytics->summary($id),
            'memberships' => $analytics->memberships($id),
            'transactions' => $analytics->transactions($id),
            'cards' => \App\Modules\Loyalty\Models\LoyaltyCard::where('business_id', $id)->with('client:id,name', 'program:id,name,stamps_required,reward_description')->orderByDesc('updated_at')->paginate(18, ['*'], 'cards_page'),
            'services' => Service::where('business_id', $id)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'professionals' => Professional::where('business_id', $id)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'programs' => LoyaltyProgram::where('business_id', $id)->withCount('cards')->orderByDesc('id')->get()->map(fn ($program) => array_merge($program->toArray(), ['valid_until' => $program->valid_until?->toDateString()])),
            'plans' => MembershipPlan::where('business_id', $id)->withCount('clientMemberships as subscribers_count')
                ->withCount(['clientMemberships as active_subscribers_count' => fn ($query) => $query->where('status', 'ACTIVE')->where('starts_at', '<=', now())->where('ends_at', '>', now())])->orderByDesc('id')->get(),
            'promotions' => Promotion::where('business_id', $id)->with('services:id,name')->withCount('usages as redemptions_count')
                ->withSum('usages as saved_amount', 'saved_amount')->orderByDesc('id')->get()->map(fn ($promotion) => array_merge($promotion->toArray(), ['start_date' => $promotion->start_date?->toDateString(), 'end_date' => $promotion->end_date?->toDateString()])),
            'vouchers' => DB::table('loyalty.reward_vouchers as v')->join('people.clients as c', 'c.id', '=', 'v.client_id')->where('v.business_id', $id)
                ->select(['v.id', 'v.code', 'v.reward', 'v.status', 'v.expires_at', 'v.used_at', 'c.name as client_name'])->orderByDesc('v.created_at')->limit(50)->get()->map(fn ($voucher) => array_merge((array) $voucher, [
                    'status' => $voucher->status === 'AVAILABLE' && now()->gte($voucher->expires_at) ? 'EXPIRED' : $voucher->status,
                    'expires_at' => \Carbon\CarbonImmutable::parse($voucher->expires_at, 'UTC')->toIso8601String(),
                    'used_at' => $voucher->used_at ? \Carbon\CarbonImmutable::parse($voucher->used_at, 'UTC')->toIso8601String() : null,
                ])),
        ])->toJsonResponse();
    }

    public function save(Request $request, string $kind, ?int $id = null): JsonResponse
    {
        $request->validate(['business_id' => ['required', 'integer', Rule::exists(Business::class, 'id')]]);
        $businessId = (int) $request->business_id;
        abort_unless($request->user()->role === User::ROLE_SUPERADMIN || in_array($businessId, app(BusinessAccessService::class)->businessIds($request->user()), true), 403);
        $model = match ($kind) { 'programs' => LoyaltyProgram::class, 'plans' => MembershipPlan::class, 'promotions' => Promotion::class, default => abort(404) };
        $record = $id ? $model::where('business_id', $businessId)->findOrFail($id) : new $model();
        if ($kind === 'promotions') return $id ? app(PromotionController::class)->update($request, $id) : app(PromotionController::class)->store($request);
        if ($kind === 'programs') {
            $data = $request->validate(['name' => 'required|string|max:150', 'description' => 'nullable|string|max:2000',
                'reward_description' => 'required|string|max:255', 'stamps_required' => 'required|integer|min:1|max:50',
                'active' => 'required|boolean', 'valid_until' => 'nullable|date',
                'service_id' => ['nullable', 'integer', Rule::exists(Service::class, 'id')->where('business_id', $businessId)],
                'professional_id' => ['nullable', 'integer', Rule::exists(Professional::class, 'id')->where('business_id', $businessId)]]);
            if ($id && $record->cards()->exists() && $record->stamps_required !== $data['stamps_required']) {
                throw ValidationException::withMessages(['stamps_required' => 'Conserva la meta de las tarjetas existentes; crea otro programa para una meta nueva.']);
            }
            $data['type'] = 'STAMP';
        } else {
            if (! $request->filled('slug')) $request->merge(['slug' => $id ? $record->slug : Str::slug((string) $request->name).'-'.Str::lower(Str::random(5))]);
            $data = $request->validate(['name' => 'required|string|max:150', 'description' => 'nullable|string|max:2000',
                'slug' => ['required', 'string', 'max:100', Rule::unique(MembershipPlan::class, 'slug')->where('business_id', $businessId)->ignore($id)],
                'price' => 'required|numeric|decimal:0,2|min:0|max:5000000', 'currency' => 'required|in:COP',
                'billing_cycle' => 'required|in:MONTHLY,QUARTERLY,YEARLY', 'appointments_included' => 'required|integer|min:0|max:100',
                'discount_percentage' => 'required|numeric|min:0|max:100', 'is_active' => 'required|boolean',
                'included_services' => 'present|array|max:100', 'included_services.*' => ['integer', 'distinct', Rule::exists(Service::class, 'id')->where('business_id', $businessId)],
                'benefits' => 'present|array|max:12', 'benefits.*' => 'string|max:180', 'sort_order' => 'nullable|integer|min:0|max:1000']);
            if ($data['appointments_included'] < 1 && $data['discount_percentage'] <= 0) throw ValidationException::withMessages(['benefits' => 'Configura al menos una cita incluida o un descuento real.']);
        }
        $data['business_id'] = $businessId;
        $record = DB::transaction(function () use ($model, $id, $businessId, $kind, $data, $record) {
            if ($id) $record = $model::where('business_id', $businessId)->lockForUpdate()->findOrFail($id);
            if ($kind === 'programs' && $id && $record->cards()->exists() && $record->stamps_required !== $data['stamps_required']) {
                throw ValidationException::withMessages(['stamps_required' => 'Conserva la meta de las tarjetas existentes; crea otro programa para una meta nueva.']);
            }
            $record->fill($data)->save();
            return $record;
        }, 3);
        return ServiceResponse::success($record, 'Beneficio guardado', $id ? 200 : 201)->toJsonResponse();
    }

    public function destroy(Request $request, string $kind, int $id): JsonResponse
    {
        $model = match ($kind) { 'programs' => LoyaltyProgram::class, 'plans' => MembershipPlan::class, 'promotions' => Promotion::class, default => abort(404) };
        $record = DB::transaction(function () use ($request, $model, $kind, $id) {
            $record = $model::query()->when($request->user()->role !== User::ROLE_SUPERADMIN,
                fn ($query) => $query->whereIn('business_id', app(BusinessAccessService::class)->businessIds($request->user())))
                ->lockForUpdate()->findOrFail($id);
            $record->update([$kind === 'programs' ? 'active' : 'is_active' => false]);
            return $record;
        }, 3);
        return ServiceResponse::success($record, 'Beneficio desactivado. El historial se conserva.')->toJsonResponse();
    }

    public function card(Request $request, int $card): JsonResponse
    {
        $record = $this->ownedCard($request, $card);
        return ServiceResponse::success(['card' => $record->load('client:id,name', 'program'), 'history' => DB::table('loyalty.loyalty_transactions')
            ->where('loyalty_card_id', $card)->orderByDesc('created_at')->orderByDesc('id')->limit(50)->get(['id', 'points', 'description', 'created_at'])->map(function ($entry) { $entry->created_at = \Carbon\CarbonImmutable::parse($entry->created_at, 'UTC')->toIso8601String(); return $entry; })])->toJsonResponse();
    }

    public function stamp(Request $request, int $card): JsonResponse
    {
        $data = $request->validate(['idempotency_key' => 'required|uuid']);
        $this->ownedCard($request, $card);
        $result = DB::transaction(function () use ($card, $data) {
            $record = \App\Modules\Loyalty\Models\LoyaltyCard::with('program')->lockForUpdate()->findOrFail($card);
            $previous = DB::table('loyalty.loyalty_transactions')->where('idempotency_key', $data['idempotency_key'])->first();
            if ($previous) { abort_unless((int) $previous->loyalty_card_id === $card, 409); return $record; }
            $program = $record->program;
            abort_unless($program && $program->active && $record->status === 'ACTIVE' && (! $program->valid_until || $program->valid_until->toDateString() >= now(config('booking.timezone'))->toDateString()), 422, 'Programa no disponible.');
            $stamps = $record->current_stamps + 1;
            $record->update(['current_stamps' => $stamps, 'total_stamps_ever' => $record->total_stamps_ever + 1, 'reward_available' => $stamps >= $program->stamps_required, 'last_stamp_at' => now()]);
            DB::table('loyalty.loyalty_transactions')->insert(['client_id' => $record->client_id, 'loyalty_card_id' => $card, 'points' => 1,
                'type' => 'EARN', 'description' => 'Sello manual añadido por el negocio', 'idempotency_key' => $data['idempotency_key'], 'created_at' => now()]);
            app(LoyaltyBenefitService::class)->notifyStamp($record);
            return $record;
        }, 3);
        return ServiceResponse::success($result)->toJsonResponse();
    }

    private function ownedCard(Request $request, int $card): \App\Modules\Loyalty\Models\LoyaltyCard
    {
        return \App\Modules\Loyalty\Models\LoyaltyCard::query()->when($request->user()->role !== User::ROLE_SUPERADMIN,
            fn ($query) => $query->whereIn('business_id', app(BusinessAccessService::class)->businessIds($request->user())))->findOrFail($card);
    }

    public function consume(Request $request, LoyaltyBenefitService $service): JsonResponse
    {
        $data = $request->validate(['code' => 'required|uuid']);
        return ServiceResponse::success($service->consumeVoucher($request->user(), $data['code']), 'Beneficio entregado')->toJsonResponse();
    }
}
