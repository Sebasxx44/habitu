<?php

namespace App\Modules\Booking\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Waitlist extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'booking.waitlists';

    protected $fillable = [
        'client_id', 'business_id', 'service_id', 'professional_id',
        'preferred_date', 'preferred_time_start', 'preferred_time_end',
        'status', 'notified_at', 'expires_at', 'branch_id', 'resource_id', 'duration_minutes', 'participants', 'preferred_date_to', 'criteria_key',
    ];

    protected $casts = [
        'preferred_date' => 'date', 'preferred_date_to' => 'date', 'duration_minutes' => 'integer', 'participants' => 'integer',
        'preferred_time_start' => 'datetime:H:i',
        'preferred_time_end' => 'datetime:H:i',
        'notified_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(\App\Modules\People\Models\Client::class, 'client_id');
    }

    public function business()
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function service()
    {
        return $this->belongsTo(\App\Modules\Catalog\Models\Service::class, 'service_id');
    }

    public function branch()
    {
        return $this->belongsTo(\App\Modules\Business\Models\BusinessBranch::class, 'branch_id');
    }

    public function resource()
    {
        return $this->belongsTo(Resource::class, 'resource_id');
    }

    public function professional()
    {
        return $this->belongsTo(\App\Modules\People\Models\Professional::class, 'professional_id');
    }
}
