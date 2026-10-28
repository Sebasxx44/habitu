<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Promotion extends Model {
    protected $fillable = ['barber_shop_id', 'title', 'description', 'image_url', 'discount', 'type', 'start_date', 'end_date', 'active', 'promo_code'];
    protected $casts = ['discount' => 'decimal:2', 'start_date' => 'date', 'end_date' => 'date', 'active' => 'boolean'];
    public function barberShop() { return $this->belongsTo(BarberShop::class); }
    public function services() {
        return $this->belongsToMany(Service::class, 'promotion_service')
                    ->withPivot(['discount', 'type'])
                    ->withTimestamps();
    }
    public function redemptions() {
        return $this->hasMany(PromotionRedemption::class);
    }
}