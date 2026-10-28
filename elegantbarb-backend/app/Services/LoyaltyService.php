<?php

namespace App\Services;

use App\Repositories\BaseRepository;
use App\Repositories\LoyaltyRepository;
use App\Models\User;
use App\Mail\LoyaltyRewardRedeemed;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use App\Models\LoyaltyCard;
use App\Models\LoyaltyProgram;
use App\Modules\Loyalty\Services\RewardRedemptionService;

class LoyaltyService extends BaseService
{
    protected BaseRepository $repository;
    protected $notificationService;

    public function __construct(LoyaltyRepository $repository, NotificationService $notificationService)
    {
        parent::__construct($repository);
        $this->notificationService = $notificationService;
    }

    public function getCards($shopId, $filters = [])
    {
        $cards = $this->repository->getCardsByShop($shopId, $filters);
        
        // Sort by progress
        return $cards->sortByDesc(function($card) {
            return $card->current_stamps / max(1, $card->program?->stamps_required ?? 1);
        })->values();
    }

    public function getStats($shopId)
    {
        return $this->repository->getStatsByShop($shopId);
    }

    public function getPrograms($shopId)
    {
        return $this->repository->getProgramsByShop($shopId);
    }

    public function createProgram($shopId, $data)
    {
        $data['business_id'] = $shopId;
        $data['active'] = true;
        return $this->repository->createProgram($data);
    }

    public function updateProgram($shopId, $programId, $data)
    {
        $program = LoyaltyProgram::where('business_id', $shopId)->findOrFail($programId);
        $program->update(collect($data)->except(['business_id'])->all());
        return $program;
    }

    public function deleteProgram($shopId, $programId)
    {
        $program = LoyaltyProgram::where('business_id', $shopId)->findOrFail($programId);
        // Keep card history and earned benefits auditable.
        return $program->update(['active' => false]);
    }

    public function addStamp($shopId, $cardId)
    {
        return DB::transaction(function () use ($shopId, $cardId) {
            $card = LoyaltyCard::where('business_id', $shopId)->with('program')->lockForUpdate()->findOrFail($cardId);
            $program = $card->program;
            abort_unless($program && $program->active && $card->status === 'ACTIVE'
                && (!$program->valid_until || $program->valid_until->toDateString() >= now(config('booking.timezone', 'America/Bogota'))->toDateString()), 422, 'Programa no disponible.');
            $card->current_stamps += 1;
            $card->total_stamps_ever += 1;
            $card->last_stamp_at = now();
            $card->reward_available = $card->current_stamps >= $program->stamps_required;
            $card->save();
            DB::table('loyalty.loyalty_transactions')->insert([
                'client_id' => $card->client_id, 'loyalty_card_id' => $card->id,
                'points' => 1, 'type' => 'EARN', 'description' => 'Sello añadido por el negocio', 'created_at' => now(),
            ]);
            return $card;
        }, 3);
    }

    public function redeemReward($shopId, $cardId)
    {
        $card = $this->repository->findCardWithDetails($cardId, $shopId);
        return app(RewardRedemptionService::class)->redeem($card->id);
    }

    public function getCardDetail($shopId, $cardId)
    {
        $card = $this->repository->findCardWithDetails($cardId, $shopId);
        $history = $this->repository->getClientHistory($card->client_id, $shopId);
        
        return [
            'card' => $card,
            'history' => $history
        ];
    }
}
