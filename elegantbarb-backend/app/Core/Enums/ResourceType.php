<?php

namespace App\Core\Enums;

enum ResourceType: string
{
    case FIELD = 'FIELD';
    case ROOM = 'ROOM';
    case CHAIR = 'CHAIR';
    case CABIN = 'CABIN';
    case MACHINE = 'MACHINE';
    case SPACE = 'SPACE';
    case COURT = 'COURT';
    case STATION = 'STATION';
    case TABLE = 'TABLE';
    case EQUIPMENT = 'EQUIPMENT';
    case OTHER = 'OTHER';

    public function label(): string
    {
        return match ($this) {
            self::FIELD => 'Cancha',
            self::ROOM => 'Sala',
            self::CHAIR => 'Silla',
            self::CABIN => 'Cabina',
            self::MACHINE => 'Máquina',
            self::SPACE => 'Espacio',
            self::COURT => 'Cancha deportiva',
            self::STATION => 'Estación',
            self::TABLE => 'Mesa',
            self::EQUIPMENT => 'Equipo',
            self::OTHER => 'Otro',
        };
    }
}
