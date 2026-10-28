<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Client extends Model
{
    protected $table = 'people.clients';

    protected $fillable = [
        'barber_shop_id', 
        'name', 
        'phone', 
        'email', 
        'loyalty_points',
        'tier',
        'xp_points',
        'is_vip'
    ];

    protected $casts = [
        'loyalty_points' => 'integer',
        'xp_points' => 'integer',
        'is_vip' => 'boolean'
    ];

    public function barberShop() { return $this->belongsTo(BarberShop::class); }
    public function appointments() { return $this->hasMany(Appointment::class); }
    
    public function favoriteBarbers()
    {
        return $this->belongsToMany(Barber::class, 'favorite_barbers');
    }

    public function favoriteShops()
    {
        return $this->belongsToMany(BarberShop::class, 'favorite_shops');
    }
}