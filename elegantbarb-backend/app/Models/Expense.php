<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Expense extends Model {
    protected $fillable = ['barber_shop_id', 'description', 'amount', 'category', 'date'];
    protected $casts = ['amount' => 'decimal:2', 'date' => 'date'];
    public function barberShop() { return $this->belongsTo(BarberShop::class); }
}