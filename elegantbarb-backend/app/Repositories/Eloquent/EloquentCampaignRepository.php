<?php

namespace App\Repositories\Eloquent;

use App\Models\Campaign;
use App\Repositories\Interfaces\CampaignRepositoryInterface;
use Illuminate\Support\Collection;

class EloquentCampaignRepository implements CampaignRepositoryInterface
{
    public function allByShop(int $shopId): Collection
    {
        return Campaign::where('business_id', $shopId)
            ->with(['user', 'barberShop'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function find(int $id): ?Campaign
    {
        return Campaign::with(['user', 'barberShop'])->find($id);
    }

    public function create(array $data): Campaign
    {
        return Campaign::create($data);
    }

    public function update(int $id, array $data): bool
    {
        $campaign = Campaign::find($id);
        if (!$campaign) return false;
        return $campaign->update($data);
    }

    public function delete(int $id): bool
    {
        $campaign = Campaign::find($id);
        if (!$campaign) return false;
        return $campaign->delete();
    }
}
