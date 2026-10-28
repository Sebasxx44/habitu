<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Product extends Model {
    protected $fillable = ['barber_shop_id', 'name', 'description', 'price', 'stock', 'active'];
    protected $casts = ['price' => 'decimal:2', 'active' => 'boolean'];
    public function barberShop() { return $this->belongsTo(BarberShop::class); }
}