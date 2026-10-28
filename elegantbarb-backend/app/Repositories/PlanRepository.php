<?php
namespace App\Repositories;
use App\Modules\Subscriptions\Models\Plan;
class PlanRepository extends BaseRepository
{
    public function __construct(Plan $model) { parent::__construct($model); }
}