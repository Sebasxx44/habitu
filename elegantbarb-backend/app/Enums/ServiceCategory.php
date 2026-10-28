<?php

namespace App\Enums;

enum ServiceCategory: string
{
    case DEGRADADOS    = 'Degradados (Fades)';
    case BARBA         = 'Cuidado de Barba';
    case TIJERAS       = 'Corte Clásico a Tijera';
    case COLOR         = 'Colorimetría y Tintura';
    case TRATAMIENTOS  = 'Tratamientos Capilares';
    case ESTILISMO     = 'Estilismo y Peinado';
    case DISEÑO        = 'Diseño y Hair Tattoo';
    case TRADICIONAL   = 'Barbería Tradicional';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
