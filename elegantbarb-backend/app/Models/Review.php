<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Review extends Model {
    protected $fillable = ['barber_shop_id', 'client_id', 'rating', 'comment'];
    public function barberShop() { return $this->belongsTo(BarberShop::class); }
    public function client() { return $this->belongsTo(Client::class); }
}