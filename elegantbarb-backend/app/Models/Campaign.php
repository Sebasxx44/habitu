<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Modules\Business\Models\Business;

class Campaign extends Model
{
    use HasFactory;

    protected $table = 'marketing.campaigns';

    protected $fillable = [
        'user_id',
        'business_id',
        'subject',
        'body',
        'type',
        'status',
        'target_role',
        'target_ids',
        'segment',
        'promotion_id',
        'recipients_count',
        'sent_count',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'target_ids' => 'array',
        'segment' => 'array',
        'recipients_count' => 'integer',
        'sent_count' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function barberShop()
    {
        return $this->belongsTo(Business::class, 'business_id');
    }

    public function logs()
    {
        return $this->hasMany(CampaignLog::class);
    }

    public function promotion(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\App\Modules\Marketing\Models\Promotion::class);
    }
}
