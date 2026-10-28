<?php

declare(strict_types=1);

namespace App\Core\Support;

use InvalidArgumentException;

final class Money
{
    public static function minor(float|int|string $amount): int
    {
        $value = is_float($amount) ? sprintf('%.10F', $amount) : (string) $amount;
        $value = rtrim(rtrim(str_contains($value, '.') ? $value : $value . '.00', '0'), '.');
        if (! preg_match('/^\d{1,12}(?:\.\d{1,2})?$/', $value)) {
            throw new InvalidArgumentException('El monto debe ser positivo y tener máximo dos decimales.');
        }
        [$units, $fraction] = array_pad(explode('.', $value, 2), 2, '');
        return ((int) $units * 100) + (int) str_pad($fraction, 2, '0');
    }

    public static function decimal(int $minor): string
    {
        if ($minor < 0 || $minor > 99999999999999) {
            throw new InvalidArgumentException('El saldo queda fuera del rango permitido.');
        }
        return intdiv($minor, 100) . '.' . str_pad((string) ($minor % 100), 2, '0', STR_PAD_LEFT);
    }
}
