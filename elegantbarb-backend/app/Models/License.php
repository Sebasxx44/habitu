<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class License extends Model
{
    use HasFactory;

    protected $fillable = [
        'barber_shop_id', 'plan_id', 'status', 'billing_cycle',
        'starts_at', 'expires_at', 'trial_ends_at', 'cancelled_at',
        'payment_method', 'transaction_id', 'amount_paid', 'warnings_sent'
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'trial_ends_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'amount_paid' => 'decimal:2',
    ];

    const STATUS_TRIAL = 'TRIAL';
    const STATUS_ACTIVE = 'ACTIVE';
    const STATUS_PAST_DUE = 'PAST_DUE';
    const STATUS_EXPIRED = 'EXPIRED';
    const STATUS_SUSPENDED = 'SUSPENDED';
    const STATUS_CANCELLED = 'CANCELLED';

    public function barberShop()
    {
        return $this->belongsTo(BarberShop::class);
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', [self::STATUS_TRIAL, self::STATUS_ACTIVE]);
    }

    public function scopeExpiringSoon($query, $days = 7)
    {
        return $query->whereIn('status', [self::STATUS_TRIAL, self::STATUS_ACTIVE])
            ->where('expires_at', '<=', Carbon::now()->addDays($days))
            ->where('expires_at', '>=', Carbon::now());
    }

    public function isTrial()
    {
        return $this->status === self::STATUS_TRIAL;
    }

    public function isActive()
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isExpired()
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function daysRemaining()
    {
        if (!$this->expires_at) return 0;
        return max(0, Carbon::now()->diffInDays($this->expires_at, false));
    }

    public function getStatusColorAttribute()
    {
        return match($this->status) {
            self::STATUS_TRIAL => 'amber',
            self::STATUS_ACTIVE => 'emerald',
            self::STATUS_PAST_DUE => 'orange',
            self::STATUS_EXPIRED => 'red',
            self::STATUS_SUSPENDED => 'rose',
            self::STATUS_CANCELLED => 'gray',
            default => 'gray',
        };
    }

    public function getStatusLabelAttribute()
    {
        return match($this->status) {
            self::STATUS_TRIAL => 'En prueba',
            self::STATUS_ACTIVE => 'Activa',
            self::STATUS_PAST_DUE => 'Pago pendiente',
            self::STATUS_EXPIRED => 'Vencida',
            self::STATUS_SUSPENDED => 'Suspendida',
            self::STATUS_CANCELLED => 'Cancelada',
            default => $this->status,
        };
    }
}