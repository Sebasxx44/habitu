<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'icon', 'active'];

    public function barberShops()
    {
        return $this->belongsToMany(BarberShop::class)
                    ->withPivot('is_active', 'instructions')
                    ->withTimestamps();
    }
}
