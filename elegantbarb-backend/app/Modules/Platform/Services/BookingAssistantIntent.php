<?php

namespace App\Modules\Platform\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

final class BookingAssistantIntent
{
    public function resolve(string $content, ?string $image, array $history, array $context, array $explicitContext = []): array
    {
        $provided = app(GeminiService::class)->interpret($content, $image, $history);
        $rules = ['intent' => 'required|in:search,availability,promotions,repeat,my_appointments,reschedule', 'q' => 'sometimes|string|max:100',
            'zone' => 'sometimes|string|max:100', 'date' => 'sometimes|date_format:Y-m-d',
            'time_from' => 'sometimes|date_format:H:i', 'time_to' => 'sometimes|date_format:H:i',
            'date_to' => 'sometimes|date_format:Y-m-d', 'duration_minutes' => 'sometimes|integer|min:1|max:1440',
            'participants' => 'sometimes|integer|min:1|max:10000', 'booking_model' => 'sometimes|in:professional,resource,direct,optional_professional,capacity',
            'max_price' => 'sometimes|numeric|min:0|max:100000000', 'nearby' => 'sometimes|boolean'];
        $valid = $provided !== null && ! Validator::make($provided, $rules)->fails();
        $local = $this->local($content);
        $subject = BookingAssistantLanguage::subject($content);
        if ($subject === null && ! in_array($local['intent'], ['repeat', 'my_appointments', 'reschedule'], true) && ! BookingAssistantLanguage::changesSubject($content)) {
            $subject = BookingAssistantLanguage::literalSubject($content);
        }
        $intent = $valid ? array_intersect_key($provided, $rules) : $local;
        // The latest explicit subject/date outranks a provider response influenced by previous messages.
        if ($subject !== null) {
            $intent = array_replace($intent, $local, ['q' => $subject]);
            unset($intent['booking_model']);
            if (isset($local['booking_model'])) $intent['booking_model'] = $local['booking_model'];
        } else {
            foreach (['date', 'date_to', 'time_from', 'time_to'] as $field) if (isset($local[$field])) $intent[$field] = $local[$field];
        }
        if ($subject === null && $image === null && empty($context['q']) && empty($context['business_id']) && empty($context['service_id'])
            && empty($explicitContext['business_id']) && empty($explicitContext['service_id']) && ! isset($local['q'])) {
            unset($intent['q']);
        }
        $changed = BookingAssistantLanguage::changesSubject($content)
            || ($subject !== null && BookingAssistantLanguage::normalize($subject) !== BookingAssistantLanguage::normalize($context['q'] ?? ''));
        if ($changed) {
            // Location and language are preferences; selected business, category, sport, schedule and budget are a particular request.
            $context = array_intersect_key($context, array_flip(['locale', 'lat', 'lng', 'zone']));
            $explicitContext = array_intersect_key($explicitContext, array_flip(['locale', 'lat', 'lng', 'zone']));
            $intent = array_replace($local, $subject !== null ? ['q' => $subject] : []);
        }
        $relativeTime = preg_match('/mas temprano|earlier/', BookingAssistantLanguage::normalize($content)) ? 'earlier'
            : (preg_match('/mas tarde|later/', BookingAssistantLanguage::normalize($content)) ? 'later' : null);
        $timeClarification = false;
        if ($relativeTime && ! isset($local['time_from'])) {
            $reference = $context[$relativeTime === 'earlier' ? 'time_from' : 'time_to'] ?? $context['time_from'] ?? $context['time_to'] ?? null;
            unset($context['time_from'], $context['time_to'], $intent['time_from'], $intent['time_to']);
            if ($reference === null) $timeClarification = true;
            else {
                $minutes = (int) substr($reference, 0, 2) * 60 + (int) substr($reference, 3, 2) + ($relativeTime === 'earlier' ? -1 : 1);
                if ($minutes < 0 || $minutes > 1439) $timeClarification = true;
                else $intent[$relativeTime === 'earlier' ? 'time_to' : 'time_from'] = sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
            }
        }
        if (isset($local['date'])) unset($context['date_to']);
        if (isset($local['time_from'])) unset($context['time_from'], $context['time_to']);
        if ($local['intent'] === 'reschedule') $intent['intent'] = 'reschedule';
        $filters = array_replace($context, array_diff_key($intent, ['intent' => true, 'nearby' => true]), $explicitContext);
        $filters = array_filter($filters, fn ($value) => $value !== null && $value !== '');
        $clarification = $timeClarification || (! in_array($intent['intent'], ['repeat', 'my_appointments', 'promotions', 'reschedule'], true)
            && empty($filters['q']) && empty($filters['service_id']) && empty($filters['business_id']));
        $clock = CarbonImmutable::now(config('booking.timezone'))->startOfDay();
        if (isset($filters['date'])) {
            if (Validator::make(['date' => $filters['date']], ['date' => 'date_format:Y-m-d'])->fails()) unset($filters['date']);
            else {
                $date = CarbonImmutable::parse($filters['date'], config('booking.timezone'));
                if ($date < $clock || $date > $clock->addDays(180)) unset($filters['date']);
            }
        }
        if (isset($filters['date_to']) && (! isset($filters['date']) || $filters['date_to'] < $filters['date'] || $filters['date_to'] > CarbonImmutable::parse($filters['date'], config('booking.timezone'))->addDays(6)->toDateString())) unset($filters['date_to']);
        if (($intent['intent'] ?? '') === 'promotions') $filters['promotions'] = true;
        if (($intent['intent'] ?? '') === 'availability' && ! isset($filters['date'])) $filters['date'] = $clock->toDateString();
        if (isset($filters['lat'], $filters['lng']) && ! empty($intent['nearby'])) { $filters['sort'] = 'distance'; $filters['radius'] = 15; }
        return ['intent' => $intent['intent'], 'filters' => $filters, 'source' => $valid ? 'gemini' : 'catalog', 'clarification_required' => $clarification, 'clarification_field' => $timeClarification ? $relativeTime : 'service',
            'location_required' => ! empty($intent['nearby']) && ! isset($filters['lat'], $filters['lng']) && empty($filters['zone']),
            'image_unavailable' => $image !== null && ! $valid];
    }

    private function local(string $content): array
    {
        $text = Str::ascii(mb_strtolower($content));
        $now = CarbonImmutable::now(config('booking.timezone'))->startOfDay();
        $result = ['intent' => 'search', 'nearby' => (bool) preg_match('/cerca|nearby|near me/', $text)];
        if (preg_match('/promoci|descuento|oferta|promotion|discount|deal/', $text)) $result['intent'] = 'promotions';
        if (preg_match('/reprogram|reschedule|mover (?:mi |la )?(?:cita|reserva)|cambiar (?:mi |la )?(?:cita|reserva)/', $text)) $result['intent'] = 'reschedule';
        elseif (preg_match('/ultima cita|mismo profesional|nuevamente|repetir|book again|repeat|last appointment/', $text)) $result['intent'] = 'repeat';
        elseif (preg_match('/mis citas|mis reservas|proxima cita|my appointments|my bookings/', $text)) $result['intent'] = 'my_appointments';
        elseif (preg_match('/disponibilidad|disponible|horarios|available|availability/', $text)) $result['intent'] = 'availability';
        $subject = BookingAssistantLanguage::subject($content);
        if ($subject !== null) $result['q'] = $subject;
        if ((str_contains($text, 'manana') && ! str_contains($text, 'por la manana')) || str_contains($text, 'tomorrow')) $result['date'] = $now->addDay()->toDateString();
        elseif (str_contains($text, 'hoy') || str_contains($text, 'today')) $result['date'] = $now->toDateString();
        foreach (['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as $day => $name) {
            if (str_contains($text, $name) || str_contains($text, ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][$day])) $result['date'] = $now->addDays(($day - $now->dayOfWeek + 7) % 7)->toDateString();
        }
        if (preg_match('/fin de semana|weekend/', $text)) { $result['date'] = $now->addDays((6 - $now->dayOfWeek + 7) % 7)->toDateString(); $result['date_to'] = CarbonImmutable::parse($result['date'])->addDay()->toDateString(); }
        if (preg_match('/\b(20\d{2}-\d{2}-\d{2})\b/', $text, $match)) $result['date'] = $match[1];
        if (! str_contains($text, 'mas tarde') && (str_contains($text, 'tarde') || str_contains($text, 'afternoon'))) { $result['time_from'] = '12:00'; $result['time_to'] = '18:00'; }
        if ((str_contains($text, 'noche') || str_contains($text, 'evening') || str_contains($text, 'tonight'))) { $result['time_from'] = '18:00'; $result['time_to'] = '23:00'; }
        if (str_contains($text, 'por la manana') || str_contains($text, 'morning')) { $result['time_from'] = '08:00'; $result['time_to'] = '12:00'; }
        if (preg_match('/(?:despues de las?|a las?|after|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/', $text, $match)) {
            $hour = (int) $match[1]; $minute = (int) ($match[2] ?? 0);
            if (($match[3] ?? '') === 'pm' && $hour < 12) $hour += 12;
            elseif (($match[3] ?? '') === 'am' && $hour === 12) $hour = 0;
            elseif (empty($match[3]) && $hour >= 1 && $hour <= 9) $hour += 12;
            if ($hour <= 23 && $minute <= 59) {
                $result['time_from'] = sprintf('%02d:%02d', $hour, $minute);
                if (! preg_match('/despues|after/', $match[0])) $result['time_to'] = $result['time_from'];
                else unset($result['time_to']);
            }
        }
        if (preg_match('/(?:durante|por|for)\s+(\d{1,2})\s*(?:horas?|hours?|h\b)/', $text, $match)) $result['duration_minutes'] = min(1440, (int) $match[1] * 60);
        if (preg_match('/(\d{1,3})\s*(?:cupos?|personas?|seats?|people|spots?)/', $text, $match)) $result['participants'] = (int) $match[1];
        if ((! isset($result['date']) || $result['date'] === $now->toDateString()) && preg_match('/\bahora\b|\bnow\b|en (?:30|60) min|en (?:una|1) hora|in (?:30|60) min|in (?:one|1) hour/', $text)) {
            $delay = preg_match('/30\s*min/', $text) ? 30 : (preg_match('/60\s*min|(?:una|one|1) hora|(?:one|1) hour/', $text) ? 60 : 0);
            $start = CarbonImmutable::now(config('booking.timezone'))->addMinutes($delay);
            $result['date'] = $start->toDateString(); $result['time_from'] = $start->format('H:i');
            $result['time_to'] = $start->addMinutes(60)->isSameDay($start) ? $start->addMinutes(60)->format('H:i') : '23:59';
            $result['intent'] = 'availability';
        }
        if (isset($result['q']) && in_array($result['q'], ['futbol','tenis','padel','cancha','salon','sala','espacio'], true)) $result['booking_model'] = 'resource';
        if (preg_match('/(?:menos de|hasta|presupuesto|under|budget|up to|\$)\s*\$?\s*([\d.,]+)\s*(mil)?/', $text, $match)) {
            $value = (float) str_replace(['.', ','], '', $match[1]);
            $result['max_price'] = min(100000000, $value * (! empty($match[2]) ? 1000 : 1));
        }
        foreach (['pereira', 'pinares', 'circunvalar', 'alamos', 'cerritos', 'altagracia', 'san jorge'] as $zone) {
            if (str_contains($text, $zone)) { $result['zone'] = $zone; break; }
        }
        return $result;
    }
}
