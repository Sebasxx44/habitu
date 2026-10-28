<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Appointment extends Model
{
    protected $fillable = ['booking_code', 'barber_shop_id', 'barber_id', 'client_id', 'service_id', 'date', 'time', 'status', 'price', 'paid', 'gallery', 'payment_method'];
    protected $casts = ['date' => 'date', 'time' => 'string', 'price' => 'decimal:2', 'paid' => 'boolean', 'gallery' => 'array'];
    public function barberShop() { return $this->belongsTo(BarberShop::class); }
    public function barber() { return $this->belongsTo(Barber::class); }
    public function client() { return $this->belongsTo(Client::class); }
    public function service() { return $this->belongsTo(Service::class); }
}