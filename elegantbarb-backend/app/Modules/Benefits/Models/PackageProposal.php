<?php

declare(strict_types=1);

namespace App\Modules\Benefits\Models;

use Illuminate\Database\Eloquent\Model;

final class PackageProposal extends Model
{
    protected $table = 'booking.package_proposals';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $guarded = [];
    protected $casts = ['snapshot' => 'array', 'appointment_ids' => 'array', 'expires_at' => 'immutable_datetime'];
}
