<?php

declare(strict_types=1);

namespace App\Modules\Marketing\Services;

use App\Modules\Booking\Models\Resource;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\People\Models\Professional;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class BookingDistributionService
{
    public function selection(Business $business, array $input): array
    {
        $selection = [];
        foreach (['service_id' => Service::class, 'resource_id' => Resource::class, 'branch_id' => BusinessBranch::class, 'professional_id' => Professional::class] as $key => $model) {
            if (empty($input[$key])) continue;
            if (! $model::whereKey($input[$key])->where('business_id', $business->id)->where('is_active', true)->exists()) {
                throw ValidationException::withMessages([$key => 'La selección no está activa en este negocio.']);
            }
            $selection[$key] = (int) $input[$key];
        }
        if (! empty($input['promo_code'])) {
            $promotion = Promotion::where('business_id', $business->id)->where('promo_code', $input['promo_code'])->first();
            if (! $promotion || ! $promotion->isValid()) throw ValidationException::withMessages(['promo_code' => 'La promoción no está disponible.']);
            $selection['promo_code'] = $promotion->promo_code;
        }
        return $selection;
    }

    public function settings(int $businessId): array
    {
        $row = DB::table('marketing.booking_distribution')->where('business_id', $businessId)->first();
        return ['enabled' => (bool) ($row?->enabled ?? false), 'theme' => $row?->theme ?? 'light', 'locale' => $row?->locale ?? 'es',
            'allowed_origins' => $row ? json_decode($row->allowed_origins, true, 512, JSON_THROW_ON_ERROR) : []];
    }

    public function origins(array $origins): array
    {
        return array_values(array_unique(array_map(function (string $origin): string {
            $parts = parse_url($origin);
            if (! $parts || ($parts['scheme'] ?? '') !== 'https' || ! filter_var($origin, FILTER_VALIDATE_URL)
                || isset($parts['user'], $parts['pass']) || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])
                || (isset($parts['path']) && $parts['path'] !== '' && $parts['path'] !== '/') || str_contains($parts['host'] ?? '', '*')) {
                throw ValidationException::withMessages(['allowed_origins' => 'Usa orígenes HTTPS exactos, sin rutas, credenciales ni comodines.']);
            }
            return 'https://'.strtolower($parts['host']).(isset($parts['port']) && $parts['port'] !== 443 ? ':'.$parts['port'] : '');
        }, $origins)));
    }

    public function present(object $link): array
    {
        $base = rtrim((string) config('app.url'), '/').'/api/v2/distribution';
        return ['id' => $link->id, 'label' => $link->label, 'selection' => json_decode($link->selection, true, 512, JSON_THROW_ON_ERROR),
            'active' => (bool) $link->active, 'opens_count' => (int) $link->opens_count, 'last_opened_at' => $link->last_opened_at ? \Carbon\CarbonImmutable::parse($link->last_opened_at)->toIso8601String() : null,
            'url' => $base.'/go/'.$link->id, 'widget_url' => $base.'/widget/'.$link->id];
    }

    public function destination(object $link, Business $business): string
    {
        $selection = $this->selection($business, json_decode($link->selection, true, 512, JSON_THROW_ON_ERROR));
        return rtrim((string) config('app.frontend_url'), '/').'/b/'.rawurlencode($business->slug).'?'.http_build_query($selection + ['book' => '1']);
    }
}
