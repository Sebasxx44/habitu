<?php

namespace App\Modules\Booking\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class RoutineOccurrence extends Model
{
    protected $table = 'booking.routine_occurrences';
    protected $fillable = ['routine_id', 'position', 'date', 'start_time', 'status', 'appointment_id', 'accepted_conditions'];
    protected $casts = ['date' => 'immutable_date', 'accepted_conditions' => 'array'];

    public function routine(): BelongsTo
    {
        return $this->belongsTo(BookingRoutine::class, 'routine_id');
    }
}
