<?php

namespace App\Modules\OnDemand\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnDemandStatusHistory extends Model
{
    use HasFactory;

    protected $table = 'on_demand.status_history';

    protected $fillable = [
        'request_id', 'from_status', 'to_status', 'changed_by', 'notes', 'metadata',
    ];

    protected $casts = [
        'metadata' => 'json',
    ];

    public function request(): BelongsTo
    {
        return $this->belongsTo(OnDemandRequest::class, 'request_id');
    }
}
