<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Barber extends Model
{
    protected $fillable = [
        'barber_shop_id', 'name', 'specialty', 'phone', 'email', 
        'photo_url', 'bio', 'commission_percentage', 'social_media', 
        'address', 'birthday', 'identification_number', 'active'
    ];

    protected $casts = [
        'active' => 'boolean',
        'social_media' => 'json',
        'commission_percentage' => 'decimal:2',
        'birthday' => 'date',
    ];

    public function barberShop()
    {
        return $this->belongsTo(BarberShop::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function portfolios()
    {
        return $this->hasMany(BarberPortfolio::class);
    }

    public function favoritedByClients()
    {
        return $this->belongsToMany(Client::class, 'favorite_barbers');
    }
}