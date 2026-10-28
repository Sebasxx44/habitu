<?php

namespace App\Core\Enums;

enum AppointmentStatus: string
{
    case PENDING = 'PENDING';
    case CONFIRMED = 'CONFIRMED';
    case COMPLETED = 'COMPLETED';
    case CANCELLED = 'CANCELLED';
    case NO_SHOW = 'NO_SHOW';
    case RESCHEDULED = 'RESCHEDULED';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pendiente',
            self::CONFIRMED => 'Confirmada',
            self::COMPLETED => 'Completada',
            self::CANCELLED => 'Cancelada',
            self::NO_SHOW => 'No asistió',
            self::RESCHEDULED => 'Reagendada',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PENDING => 'amber',
            self::CONFIRMED => 'emerald',
            self::COMPLETED => 'blue',
            self::CANCELLED => 'rose',
            self::NO_SHOW => 'orange',
            self::RESCHEDULED => 'violet',
        };
    }
}
