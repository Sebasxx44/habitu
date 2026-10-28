<?php

namespace App\Modules\Business\Services;

use App\Modules\Business\Models\Business;

class BusinessSettingsService
{
    private const DAYS = ['Dom' => 0, 'Lun' => 1, 'Mar' => 2, 'Mie' => 3, 'Jue' => 4, 'Vie' => 5, 'Sab' => 6];
    private const ENGLISH_DAYS = ['SUNDAY' => 0, 'MONDAY' => 1, 'TUESDAY' => 2, 'WEDNESDAY' => 3, 'THURSDAY' => 4, 'FRIDAY' => 5, 'SATURDAY' => 6];

    public function update(Business $business, array $data): void
    {
        $branchFields = array_intersect_key($data, array_flip(['address', 'lat', 'lng']));
        if ($branchFields || isset($data['opening_hours'])) {
            $branch = $business->branches()->where('is_main_branch', true)->first()
                ?? $business->branches()->first()
                ?? $business->branches()->create(['name' => 'Sede Principal', 'address' => '', 'is_main_branch' => true, 'is_active' => true]);
            $branch->update($branchFields);
            $schedules = $branch->schedules()->get();
            foreach ($data['opening_hours'] ?? [] as $day => $hours) {
                $values = [
                    'open_time' => $hours['start'], 'close_time' => $hours['end'], 'is_closed' => ! $hours['active'],
                ];
                $existing = $schedules->filter(fn ($schedule) => $this->dayIndex((string) $schedule->day) === self::DAYS[$day]);
                if ($existing->isNotEmpty()) {
                    // Update every existing alias consistently without inserting a duplicate weekday.
                    $branch->schedules()->whereIn('id', $existing->modelKeys())->update($values);
                } else {
                    $branch->schedules()->create(['day' => self::DAYS[$day], ...$values]);
                }
            }
        }

        foreach (['whatsapp', 'instagram'] as $platform) {
            if (array_key_exists($platform, $data)) {
                $business->socialLinks()->updateOrCreate(['platform' => $platform], [
                    'url' => $data[$platform] ?? '', 'is_active' => ! empty($data[$platform]),
                ]);
            }
        }
    }

    public function present(Business $business): Business
    {
        $branch = $business->branches->firstWhere('is_main_branch', true) ?? $business->branches->first();
        $business->setAttribute('address', $branch?->address);
        $business->setAttribute('lat', $branch?->lat);
        $business->setAttribute('lng', $branch?->lng);
        $hours = [];
        foreach ($branch?->schedules ?? [] as $schedule) {
            $day = array_search($this->dayIndex((string) $schedule->day), self::DAYS, true);
            if ($day !== false) {
                $hours[$day] = ['active' => ! $schedule->is_closed, 'start' => substr($schedule->getRawOriginal('open_time'), 0, 5), 'end' => substr($schedule->getRawOriginal('close_time'), 0, 5)];
            }
        }
        $business->setAttribute('opening_hours', json_encode($hours));
        foreach (['whatsapp', 'instagram'] as $platform) {
            $business->setAttribute($platform, $business->socialLinks->firstWhere('platform', $platform)?->url ?? '');
        }
        return $business;
    }

    private function dayIndex(string $day): ?int
    {
        return preg_match('/^[0-6]$/', $day) ? (int) $day : (self::ENGLISH_DAYS[strtoupper($day)] ?? self::DAYS[$day] ?? null);
    }
}
