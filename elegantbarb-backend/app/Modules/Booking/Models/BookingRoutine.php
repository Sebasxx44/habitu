<?php

namespace App\Modules\Booking\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class BookingRoutine extends Model
{
    protected $table = 'booking.routines';
    protected $fillable = ['user_id', 'source_appointment_id', 'name', 'status', 'interval_weeks', 'template'];
    protected $casts = ['template' => 'array', 'interval_weeks' => 'integer'];

    public function occurrences(): HasMany
    {
        return $this->hasMany(RoutineOccurrence::class, 'routine_id')->orderBy('position');
    }
}
