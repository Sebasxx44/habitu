<?php

namespace App\Modules\Loyalty\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Loyalty\Models\LoyaltyCard;
use App\Modules\Loyalty\Services\RewardRedemptionService;
use App\Modules\People\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientLoyaltyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $clients = Client::where('user_id', $request->user()->id);
        $cards = LoyaltyCard::whereIn('client_id', (clone $clients)->select('id'))
            ->with('program.business')->orderByDesc('reward_available')->orderByDesc('updated_at')->get();

        return response()->json([
            'points' => (int) (clone $clients)->sum('loyalty_points'),
            'cards' => $cards->map(fn (LoyaltyCard $card) => $this->card($card))->all(),
            'history' => DB::table('loyalty.loyalty_transactions')->whereIn('client_id', (clone $clients)->select('id'))
                ->orderByDesc('created_at')->orderByDesc('id')->limit(50)->get()
                ->map(fn ($transaction) => ['id' => $transaction->id, 'points' => (int) $transaction->points,
                    'unit' => $transaction->loyalty_card_id ? 'STAMP' : 'POINT', 'type' => $transaction->type, 'description' => $transaction->description, 'createdAt' => $transaction->created_at])->all(),
        ])->header('Cache-Control', 'private, no-store');
    }

    public function redeem(Request $request, string $card, RewardRedemptionService $service): JsonResponse
    {
        $data = $request->validate(['idempotency_key' => ['required', 'uuid']]);
        $owned = LoyaltyCard::whereHas('client', fn ($query) => $query->where('user_id', $request->user()->id))->findOrFail($card);
        $result = $service->redeem($owned->id, $data['idempotency_key']);
        return response()->json(['message' => 'Recompensa canjeada correctamente.', 'card' => $this->card($result)]);
    }

    private function card(LoyaltyCard $card): array
    {
        $program = $card->program;
        $valid = $program && $program->active && (!$program->valid_until
            || $program->valid_until->toDateString() >= now(config('booking.timezone', 'America/Bogota'))->toDateString());

        return [
            'businessId' => $card->business_id, 'id' => $card->id, 'name' => $program?->name ?? 'Programa archivado',
            'business' => $program?->business?->name ?? 'Negocio archivado',
            'stamps' => $card->current_stamps, 'required' => $program?->stamps_required ?? 0,
            'reward' => $program?->reward_description ?? '',
            'available' => $valid && $card->status === 'ACTIVE' && $card->reward_available
                && $program->stamps_required > 0 && $card->current_stamps >= $program->stamps_required,
            'status' => ! $valid ? 'EXPIRED' : $card->status, 'validUntil' => $program?->valid_until?->toDateString(),
        ];
    }
}
