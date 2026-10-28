<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BarberShop extends Model
{
    protected $fillable = ['name', 'address', 'phone', 'whatsapp', 'instagram', 'email', 'city_id', 'lat', 'lng', 'active', 'license_id', 'opening_hours', 'description', 'banner_url', 'photo_url'];

    protected $casts = [
        'lat' => 'decimal:8',
        'lng' => 'decimal:8',
        'active' => 'boolean',
    ];

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class);
    }

    public function paymentMethods()
    {
        return $this->belongsToMany(PaymentMethod::class)
                    ->withPivot('is_active', 'instructions')
                    ->withTimestamps();
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function barbers()
    {
        return $this->hasMany(Barber::class);
    }

    public function clients()
    {
        return $this->hasMany(Client::class);
    }

    public function services()
    {
        return $this->hasMany(Service::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function hours()
    {
        return $this->hasMany(Hour::class);
    }
}