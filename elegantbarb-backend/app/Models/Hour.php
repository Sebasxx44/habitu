<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Hour extends Model {
    protected $fillable = ['barber_shop_id', 'day', 'open_time', 'close_time', 'closed'];
    protected $casts = ['closed' => 'boolean'];
    public function barberShop() { return $this->belongsTo(BarberShop::class); }
}