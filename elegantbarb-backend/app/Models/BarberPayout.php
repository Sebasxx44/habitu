<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BarberPayout extends Model
{
    use HasFactory;

    protected $fillable = [
        'barber_id',
        'amount',
        'period_start',
        'period_end',
        'status',
        'notes',
        'paid_at'
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'paid_at' => 'datetime',
        'amount' => 'decimal:2'
    ];

    public function barber()
    {
        return $this->belongsTo(Barber::class);
    }
}
