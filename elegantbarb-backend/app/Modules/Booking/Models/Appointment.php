<?php

namespace App\Modules\Booking\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Core\Enums\AppointmentStatus;

class Appointment extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'booking.appointments';

    protected $fillable = [
        'booking_code', 'dynamic_pricing', 'hold_expires_at', 'checkout_snapshot',
        'idempotency_key', 'duration_minutes', 'participants', 'booking_model',
        'business_id',
        'branch_id',
        'client_id',
        'professional_id',
        'service_id',
        'resource_id',
        'date',
        'start_time',
        'end_time',
        'status',
        'payment_status',
        'price',
        'discount_amount',
        'final_price',
        'currency',
        'notes',
        'source',
        'checked_in_at',
        'completed_at',
        'cancelled_at',
    ];

    protected $casts = [
        'hold_expires_at' => 'immutable_datetime', 'checkout_snapshot' => 'array',
        'dynamic_pricing' => 'array', 'date' => 'date', 'duration_minutes' => 'integer', 'participants' => 'integer',
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'status' => AppointmentStatus::class,
        'price' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'final_price' => 'decimal:2',
        'checked_in_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\BusinessBranch::class, 'branch_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Client::class, 'client_id');
    }

    public function professional(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Professional::class, 'professional_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Catalog\Models\Service::class, 'service_id');
    }

    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class, 'resource_id');
    }


    public function scopeOccupyingInventory($query)
    {
        return $query->where(fn ($hold) => $hold->whereNull('hold_expires_at')->orWhere('hold_expires_at', '>', now()));
    }

    public function scopePending($query)
    {
        return $query->where('status', AppointmentStatus::PENDING);
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', AppointmentStatus::CONFIRMED);
    }

    public function scopeUpcoming($query)
    {
        return $query->whereIn('status', [AppointmentStatus::PENDING, AppointmentStatus::CONFIRMED])
            ->where('date', '>=', now()->toDateString());
    }

    public function scopeForDate($query, string $date)
    {
        return $query->where('date', $date);
    }

    public function isCancelable(): bool
    {
        return in_array($this->status, [
            AppointmentStatus::PENDING,
            AppointmentStatus::CONFIRMED,
        ], true);
    }
}
