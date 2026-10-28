<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    protected $fillable = [
        'barber_shop_id', 'name', 'description', 'price',
        'duration_minutes', 'active', 'image_url', 'media_gallery', 'category'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'active' => 'boolean',
        'media_gallery' => 'array',
    ];

    public function barberShop()
    {
        return $this->belongsTo(BarberShop::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }
}