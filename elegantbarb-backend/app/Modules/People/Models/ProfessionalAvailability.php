<?php

namespace App\Modules\People\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfessionalAvailability extends Model
{
    use HasFactory;

    protected $table = 'people.professional_availability';

    protected $fillable = [
        'professional_id',
        'branch_id',
        'day_of_week',
        'start_time',
        'end_time',
        'is_available',
        'break_start_time',
        'break_end_time',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'is_available' => 'boolean',
    ];

    public function professional(): BelongsTo
    {
        return $this->belongsTo(Professional::class, 'professional_id');
    }
}
