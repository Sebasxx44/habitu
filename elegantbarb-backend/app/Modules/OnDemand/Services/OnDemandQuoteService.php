<?php

namespace App\Modules\OnDemand\Services;

use App\Core\DTOs\ServiceResponse;
use App\Models\User;
use App\Modules\Booking\Services\ReservationContextService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OnDemandQuoteService
{
    public function __construct(private ReservationContextService $context) {}

    public function propose(int $id, User $user, array $data): ServiceResponse
    {
        return DB::transaction(function () use ($id, $user, $data) {
            $request = $this->context->resolve('on-demand', $id, $user, true);
            abort_unless($this->context->isManager($request, $user) || $user->role === User::ROLE_PROFESSIONAL, 403);
            abort_unless(in_array($request->status, ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'], true), 422);
            $quote = ['id' => (string) Str::uuid(), 'amount' => round((float) $data['amount'], 2), 'reason' => $data['reason'],
                'proposed_at' => now()->toIso8601String(), 'accepted_at' => null, 'accepted_by' => null];
            $request->update(['metadata' => array_merge($request->metadata ?? [], ['price_quote' => $quote])]);
            return ServiceResponse::success($quote, 'Cotización pendiente de aceptación del cliente');
        });
    }

    public function accept(int $id, User $user, string $quoteId): ServiceResponse
    {
        return DB::transaction(function () use ($id, $user, $quoteId) {
            $request = $this->context->resolve('on-demand', $id, $user, true);
            abort_unless((int) $request->client?->user_id === $user->id, 403);
            abort_unless(in_array($request->status, ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'], true), 422);
            $quote = $request->metadata['price_quote'] ?? null;
            abort_unless($quote && $quote['id'] === $quoteId, 409, 'La cotización cambió. Revisa el valor vigente.');
            if (! $quote['accepted_at']) {
                $quote['accepted_at'] = now()->toIso8601String();
                $quote['accepted_by'] = $user->id;
                $request->update(['metadata' => array_merge($request->metadata ?? [], ['price_quote' => $quote])]);
            }
            return ServiceResponse::success($quote, 'Valor aceptado; no se realiza un cobro');
        });
    }
}
