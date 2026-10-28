<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PromotionRedemption extends Model
{
    use HasFactory;
    protected $fillable = ['promotion_id', 'client_id', 'appointment_id', 'saved_amount'];

    public function promotion() { return $this->belongsTo(Promotion::class); }
    public function client() { return $this->belongsTo(Client::class); }
    public function appointment() { return $this->belongsTo(Appointment::class); }
}
