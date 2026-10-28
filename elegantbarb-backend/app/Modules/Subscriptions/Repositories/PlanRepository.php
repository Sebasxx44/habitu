<?php

namespace App\Modules\Subscriptions\Repositories;

use App\Modules\Subscriptions\Models\Plan;
use App\Repositories\BaseRepository;
use Illuminate\Database\Eloquent\Collection;

class PlanRepository extends BaseRepository
{
    public function __construct(Plan $model)
    {
        parent::__construct($model);
    }

    public function getActive(): Collection
    {
        return $this->model
            ->where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->get();
    }
}
