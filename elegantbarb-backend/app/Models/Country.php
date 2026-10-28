<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Country extends Model
{
    protected $fillable = ['name', 'code', 'currency', 'timezone', 'active'];

    public function cities()
    {
        return $this->hasMany(City::class);
    }

    public function barberShops()
    {
        return $this->hasManyThrough(BarberShop::class, City::class);
    }
}