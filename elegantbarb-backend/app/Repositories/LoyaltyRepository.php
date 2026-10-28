<?php

namespace App\Repositories;

use App\Models\LoyaltyCard;
use App\Models\LoyaltyProgram;
use App\Modules\Booking\Models\Appointment;
use Illuminate\Support\Facades\DB;

class LoyaltyRepository extends BaseRepository
{
    public function __construct(LoyaltyCard $model)
    {
        parent::__construct($model);
    }

    public function getCardsByShop($shopId, $filters = [])
    {
        $query = $this->model->where('business_id', $shopId)
            ->with(['client', 'program']);

        if (isset($filters['search']) && $filters['search']) {
            $search = $filters['search'];
            $query->whereHas('client', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (isset($filters['status']) && $filters['status']) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['program_id']) && $filters['program_id']) {
            $query->where('loyalty_program_id', $filters['program_id']);
        }

        return $query->get();
    }

    public function getStatsByShop($shopId)
    {
        $activeClients = $this->model->where('business_id', $shopId)->where('status', 'ACTIVE')->count();
        $totalStamps = $this->model->where('business_id', $shopId)->sum('total_stamps_ever');
        $rewardsRedeemed = $this->model->where('business_id', $shopId)->sum('rewards_redeemed');
        
        $nearReward = $this->model->where('business_id', $shopId)
            ->whereHas('program', function($q) {
                $q->whereRaw('loyalty_cards.current_stamps = loyalty_programs.stamps_required - 1');
            })
            ->count();

        return [
            'active_clients' => $activeClients,
            'total_stamps' => $totalStamps,
            'rewards_redeemed' => $rewardsRedeemed,
            'near_reward' => $nearReward
        ];
    }

    public function getProgramsByShop($shopId)
    {
        return LoyaltyProgram::where('business_id', $shopId)->get();
    }

    public function createProgram($data)
    {
        return LoyaltyProgram::create($data);
    }

    public function updateProgram($id, $data)
    {
        $program = LoyaltyProgram::findOrFail($id);
        $program->update($data);
        return $program;
    }

    public function deleteProgram($id)
    {
        $program = LoyaltyProgram::findOrFail($id);
        return $program->delete();
    }

    public function getClientHistory($clientId, $shopId)
    {
        return Appointment::where('client_id', $clientId)
            ->where('business_id', $shopId)
            ->where('status', 'COMPLETED')
            ->with(['service', 'professional'])
            ->orderBy('date', 'desc')
            ->orderBy('start_time', 'desc')
            ->get();
    }

    public function findCardWithDetails($cardId, $shopId)
    {
        return $this->model->where('business_id', $shopId)
            ->with(['client', 'program'])
            ->findOrFail($cardId);
    }
}
