<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'description', 'monthly_price', 'annual_price',
        'max_barbers', 'max_clients', 'max_appointments_monthly',
        'has_reports', 'has_campaigns', 'has_whatsapp', 'has_payments',
        'has_loyalty', 'has_custom_domain', 'is_popular', 'is_active', 'trial_days'
    ];

    protected $casts = [
        'monthly_price' => 'decimal:2',
        'annual_price' => 'decimal:2',
        'has_reports' => 'boolean',
        'has_campaigns' => 'boolean',
        'has_whatsapp' => 'boolean',
        'has_payments' => 'boolean',
        'has_loyalty' => 'boolean',
        'has_custom_domain' => 'boolean',
        'is_popular' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function licenses()
    {
        return $this->hasMany(License::class);
    }

    public function getFormattedPriceAttribute()
    {
        return '$' . number_format($this->monthly_price, 0, ',', '.') . '/mes';
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}