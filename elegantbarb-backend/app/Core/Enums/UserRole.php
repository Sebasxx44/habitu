<?php

namespace App\Core\Enums;

enum UserRole: string
{
    case SUPERADMIN = 'SUPERADMIN';
    case ADMIN_BARBERIA = 'ADMIN_BARBERIA';
    case PROFESSIONAL = 'PROFESSIONAL';
    case CLIENTE = 'CLIENTE';

    public function label(): string
    {
        return match ($this) {
            self::SUPERADMIN => 'Superadministrador',
            self::ADMIN_BARBERIA => 'Administrador de Negocio',
            self::PROFESSIONAL => 'Profesional',
            self::CLIENTE => 'Cliente',
        };
    }

    public function hierarchy(): int
    {
        return match ($this) {
            self::SUPERADMIN => 100,
            self::ADMIN_BARBERIA => 80,
            self::PROFESSIONAL => 40,
            self::CLIENTE => 20,
        };
    }
}
