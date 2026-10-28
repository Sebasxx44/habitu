<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CampaignLog extends Model
{
    use HasFactory;

    protected $table = 'marketing.campaign_logs';

    protected $fillable = ['campaign_id', 'recipient_email', 'recipient_name', 'recipient_id', 'recipient_user_id',
        'status', 'error_message', 'tracking_token', 'sent_at', 'opened_at', 'clicked_at', 'notification_sent_at'];

    protected $hidden = ['tracking_token'];

    protected $casts = ['sent_at' => 'datetime', 'opened_at' => 'datetime', 'clicked_at' => 'datetime', 'notification_sent_at' => 'datetime'];

    public function campaign() { return $this->belongsTo(Campaign::class); }
}
