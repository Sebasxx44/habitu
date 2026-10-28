<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Subscription extends Model
{
    protected $fillable = ['client_id', 'barber_shop_id', 'start_date', 'end_date', 'status'];
    protected $casts = ['start_date' => 'date', 'end_date' => 'date'];
    public function client() { return $this->belongsTo(Client::class); }
    public function barberShop() { return $this->belongsTo(BarberShop::class); }
}