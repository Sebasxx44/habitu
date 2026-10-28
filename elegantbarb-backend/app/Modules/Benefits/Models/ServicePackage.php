<?php

declare(strict_types=1);

namespace App\Modules\Benefits\Models;

use Illuminate\Database\Eloquent\Model;

final class ServicePackage extends Model
{
    protected $table = 'catalog.service_packages';
    protected $guarded = [];
    protected $casts = ['service_ids' => 'array', 'is_active' => 'boolean'];
}
