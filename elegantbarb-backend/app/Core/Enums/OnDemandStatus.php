<?php

namespace App\Core\Enums;

enum OnDemandStatus: string
{
    case SEARCHING = 'SEARCHING';
    case ACCEPTED = 'ACCEPTED';
    case ON_THE_WAY = 'ON_THE_WAY';
    case IN_PROGRESS = 'IN_PROGRESS';
    case COMPLETED = 'COMPLETED';
    case CANCELLED = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::SEARCHING => 'Buscando profesional',
            self::ACCEPTED => 'Aceptado',
            self::ON_THE_WAY => 'En camino',
            self::IN_PROGRESS => 'En servicio',
            self::COMPLETED => 'Completado',
            self::CANCELLED => 'Cancelado',
        };
    }

    public function canTransitionTo(self $newStatus): bool
    {
        $allowed = match ($this) {
            self::SEARCHING => [self::ACCEPTED, self::CANCELLED],
            self::ACCEPTED => [self::ON_THE_WAY, self::CANCELLED],
            self::ON_THE_WAY => [self::IN_PROGRESS, self::CANCELLED],
            self::IN_PROGRESS => [self::COMPLETED, self::CANCELLED],
            default => [],
        };
        return in_array($newStatus, $allowed, true);
    }
}
