<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class LoyaltyTransaction extends Model {
    protected $fillable = ['client_id', 'points', 'type', 'appointment_id', 'description'];
    protected $casts = ['points' => 'integer'];
    public function client() { return $this->belongsTo(Client::class); }
    public function appointment() { return $this->belongsTo(Appointment::class); }
}