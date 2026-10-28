<?php

namespace App\Modules\Loyalty\Services;

use App\Modules\Loyalty\Models\LoyaltyCard;
use App\Modules\Loyalty\Models\LoyaltyProgram;
use App\Modules\Platform\Models\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RewardRedemptionService
{
    public function redeem(int $cardId, ?string $idempotencyKey = null): LoyaltyCard
    {
        return DB::transaction(function () use ($cardId, $idempotencyKey) {
            $card = LoyaltyCard::with('client')->lockForUpdate()->findOrFail($cardId);
            if ($idempotencyKey) {
                $previous = DB::table('loyalty.loyalty_transactions')->where('idempotency_key', $idempotencyKey)->first();
                if ($previous) {
                    abort_unless((int) $previous->loyalty_card_id === $cardId, 409, 'Referencia ya utilizada.');
                    return $card->load('program.business');
                }
            }
            $program = LoyaltyProgram::lockForUpdate()->findOrFail($card->loyalty_program_id);
            $today = now(config('booking.timezone', 'America/Bogota'))->toDateString();
            if (!$program->active || ($program->valid_until && $program->valid_until->toDateString() < $today)
                || $card->status !== 'ACTIVE' || !$card->reward_available || $program->stamps_required < 1
                || $card->current_stamps < $program->stamps_required) {
                throw ValidationException::withMessages(['reward' => 'Esta recompensa no está disponible para canjear.']);
            }
            $remaining = $card->current_stamps - $program->stamps_required;
            $card->update([
                'reward_available' => $remaining >= $program->stamps_required,
                'current_stamps' => $remaining,
                'rewards_redeemed' => $card->rewards_redeemed + 1,
            ]);
            $transactionId = DB::table('loyalty.loyalty_transactions')->insertGetId([
                'client_id' => $card->client_id, 'loyalty_card_id' => $card->id,
                'points' => -$program->stamps_required, 'type' => 'REDEEM',
                'description' => 'Canje de sellos: ' . $program->reward_description,
                'idempotency_key' => $idempotencyKey,
                'created_at' => now(),
            ]);
            $expires = now()->addDays(30);
            if ($program->valid_until) {
                $programExpires = \Carbon\CarbonImmutable::parse($program->valid_until->toDateString(), config('booking.timezone'))->endOfDay()->utc();
                if ($programExpires->lt($expires)) $expires = $programExpires;
            }
            DB::table('loyalty.reward_vouchers')->insert([
                'code' => (string) \Illuminate\Support\Str::uuid(), 'client_id' => $card->client_id, 'business_id' => $card->business_id,
                'loyalty_card_id' => $card->id, 'transaction_id' => $transactionId, 'reward' => $program->reward_description,
                'status' => 'AVAILABLE', 'expires_at' => $expires, 'created_at' => now(), 'updated_at' => now(),
            ]);
            if ($card->client?->user_id) {
                Notification::create([
                    'user_id' => $card->client->user_id, 'title' => 'Recompensa canjeada',
                    'message' => $program->reward_description, 'type' => 'LOYALTY_REDEEMED',
                    'data' => ['loyalty_card_id' => $card->id, 'url' => '/cliente/benefits?tab=mine'], 'read' => false,
                ]);
            }
            return $card->load('program.business');
        }, 3);
    }
}
