<?php

declare(strict_types=1);

namespace App\Modules\Platform\Services;

use Illuminate\Support\Str;

/** Conservative catalogue vocabulary; missing meaning is clarified instead of reusing an unrelated subject. */
final class BookingAssistantLanguage
{
    /** @var array<string, list<string>> */
    private const ALIASES = [
        'futbol' => ['futbol', 'football', 'soccer'], 'tenis' => ['tenis', 'tennis'], 'padel' => ['padel', 'paddle'],
        'cancha' => ['canchas?', 'courts?'], 'salon' => ['salon de eventos', 'alquilar salon', 'alquiler de salon', 'event hall', 'rent a hall'],
        'sala' => ['salas?', 'meeting room', 'coworking'], 'espacio' => ['espacios?', 'spaces?'],
        'manicure' => ['manicur[ea]', 'unas', 'manos', 'nails'], 'pedicure' => ['pedicur[ea]', 'pies'], 'barba' => ['barba', 'beard'],
        'corte' => ['cortes?', 'cortarme', 'cabello', 'barberia', 'pelo', 'haircuts?', 'hair'],
        'masaje' => ['masajes?', 'relajante', 'spa', 'massages?'], 'fisioterapia' => ['fisioterapia', 'fisioterapeutas?', 'rehabilitacion', 'physiotherapy'],
        'dental' => ['dental', 'odontolog(?:o|a|os|as|ia|ico|ica|icos|icas)?', 'dentistas?', 'dentists?', 'dentistry', 'dientes'],
        'entrenamiento' => ['entrenamiento', 'gimnasio', 'ejercicio', 'training', 'fitness'], 'color' => ['color', 'tinte'],
    ];

    public static function normalize(string $text): string
    {
        return Str::ascii(mb_strtolower(trim($text)));
    }

    public static function subject(string $text): ?string
    {
        $text = self::normalize($text);
        $found = [];
        foreach (self::ALIASES as $query => $words) foreach ($words as $word) {
            if (! preg_match_all('/\b(?:'.$word.')\b/u', $text, $matches, PREG_OFFSET_CAPTURE)) continue;
            foreach ($matches[0] as [$match, $offset]) {
                $prefix = substr($text, 0, $offset);
                if (preg_match('/(?:\bno(?: quiero| busco)?|\bnot|instead of|en vez de|en lugar de)\s*$/', $prefix)) continue;
                if (preg_match('/^\s+no\b/', substr($text, $offset + strlen($match)))) continue;
                $found[$offset] = $query;
            }
        }
        if ($found) { ksort($found); return end($found); }
        return null;
    }

    public static function changesSubject(string $text): bool
    {
        return (bool) preg_match('/\botr[oa] cosa\b|\botro servicio\b|\balgo diferente\b|\bcambiar de servicio\b|something else|another service|different service/', self::normalize($text));
    }

    public static function literalSubject(string $text): ?string
    {
        $text = self::normalize($text);
        $text = preg_replace('/\b(?:mas temprano|mas tarde|earlier|later)\b/', ' ', $text);
        $text = preg_replace('/\b20\d{2}-\d{2}-\d{2}\b|(?:a las?|despues de las?|at|after)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?|(?:durante|por|for)\s+\d+\s*(?:horas?|hours?|minutos?|minutes?)|\d+\s*(?:personas?|cupos?|seats?|people)/', ' ', $text);
        $text = preg_replace('/(?:menos de|hasta|presupuesto|under|budget|up to|\$)\s*\$?\s*[\d.,]+\s*(?:mil)?/', ' ', $text);
        $text = preg_replace('/\b(?:domingo|lunes|martes|miercoles|jueves|viernes|sabado|sunday|monday|tuesday|wednesday|thursday|friday|saturday|hoy|manana|today|tomorrow|ahora|now|proximo|next|tarde|noche|morning|afternoon|evening|weekend|fin de semana|pereira|pinares|circunvalar|alamos|cerritos|altagracia|san jorge)\b/', ' ', $text);
        $text = preg_replace('/\b(?:hola|hello|hi|gracias|thanks|que|cual|cuales|what|which|tiene|tienen|algo|anything|something|por favor|please|quiero|queria|busco|buscar|necesito|reservar|reserva|reservas|cita|citas|servicio|servicios|dame|muestra|muestrame|recomienda|recomiendes|recomiendame|opciones|disponibilidad|disponible|disponibles|horarios|promociones|descuentos|ofertas|ultima|mismo|profesional|repetir|nuevamente|mis|proxima|want|need|find|book|booking|bookings|appointments?|availability|available|show|search|options|services?|hay|ver|of|is|can|could|recommend|repeat|again|last|my|me|i|the|on|at|in|for|to|a|an|and|or|with|that|this|it|there|near|nearby|y|o|un|una|unos|unas|el|la|los|las|de|del|en|por|para|con|ese|esa|eso|este|esta|lo|ahi|tambien|cerca|mas|menos|mejor|si|no)\b/', ' ', $text);
        $text = trim(preg_replace('/\s+/', ' ', preg_replace('/[^a-z0-9\s-]/', ' ', $text)));
        if ($text === '' || self::changesSubject($text) || strlen($text) > 100) return null;
        return $text;
    }

    /** @return list<string> */
    public static function searchTerms(string $query): array
    {
        return match (self::normalize($query)) {
            'dental' => ['dental', 'odontolog', 'dentist'],
            default => [$query],
        };
    }

    public static function matches(string $text, string $query): bool
    {
        $text = self::normalize($text);
        foreach (self::searchTerms($query) as $term) if (str_contains($text, self::normalize($term))) return true;
        return false;
    }

    public static function isDomain(string $query): bool
    {
        return array_key_exists(self::normalize($query), self::ALIASES);
    }
}
