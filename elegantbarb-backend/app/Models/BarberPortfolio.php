<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BarberPortfolio extends Model
{
    use HasFactory;

    protected $fillable = ['barber_id', 'image_url', 'title', 'description'];

    public function barber()
    {
        return $this->belongsTo(Barber::class);
    }
}
