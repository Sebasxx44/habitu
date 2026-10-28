<?php

namespace App\Core\Enums;

enum PayoutStatus: string
{
    case PENDING = 'PENDING';
    case PAID = 'PAID';
    case CANCELLED = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pendiente',
            self::PAID => 'Pagado',
            self::CANCELLED => 'Cancelado',
        };
    }
}
