<?php

namespace App\Repositories\Interfaces;

use App\Models\Campaign;
use Illuminate\Support\Collection;

interface CampaignRepositoryInterface
{
    public function allByShop(int $shopId): Collection;
    public function find(int $id): ?Campaign;
    public function create(array $data): Campaign;
    public function update(int $id, array $data): bool;
    public function delete(int $id): bool;
}
