<?php

namespace App\Core\Enums;

enum PaymentStatus: string
{
    case PENDING = 'PENDING';
    case PAID = 'PAID';
    case FAILED = 'FAILED';
    case REFUNDED = 'REFUNDED';
    case PAY_AT_LOCATION = 'PAY_AT_LOCATION';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pendiente',
            self::PAID => 'Pagado',
            self::FAILED => 'Fallido',
            self::REFUNDED => 'Reembolsado',
            self::PAY_AT_LOCATION => 'Pagar en sitio',
        };
    }
}
