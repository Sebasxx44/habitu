<?php

namespace App\Modules\Business\DTOs;

use App\Modules\Booking\Models\Resource;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\People\DTOs\ProfessionalProfile;
use App\Modules\People\Models\Professional;
use App\Modules\Reviews\Models\Review;

final class PublicBusinessProfile
{
    private const BUSINESS_FIELDS = [
        'id', 'business_category_id', 'name', 'slug', 'description', 'phone', 'email', 'website',
        'logo_url', 'banner_url', 'primary_color', 'secondary_color', 'accent_color',
        'rating', 'reviews_count', 'verified', 'is_active', 'uses_professionals', 'uses_resources',
    ];
    private const SERVICE_FIELDS = [
        'id', 'business_id', 'service_category_id', 'name', 'description', 'price', 'duration_minutes',
        'image_url', 'media_gallery', 'requires_professional', 'booking_model', 'duration_mode', 'duration_options',
        'booking_capacity', 'slot_interval_minutes', 'min_advance_minutes', 'max_advance_days',
        'requires_confirmation', 'allow_cancellation', 'allow_reschedule', 'cancellation_notice_minutes',
        'reschedule_notice_minutes', 'resource_professional_optional', 'is_active',
    ];
    private const REVIEW_FIELDS = [
        'id', 'business_id', 'branch_id', 'professional_id', 'rating', 'service_rating', 'professional_rating',
        'business_rating', 'comment', 'is_verified', 'business_response', 'responded_at', 'created_at',
    ];

    public function summary(Business $business): array
    {
        $data = $business->only(self::BUSINESS_FIELDS);
        $data['category'] = $business->category?->only(['id', 'name', 'slug', 'icon', 'color', 'description']);
        $branches = $business->branches->filter(fn (BusinessBranch $branch): bool => $branch->is_active && $branch->deleted_at === null);
        $data['branches'] = $branches->map(fn (BusinessBranch $branch): array => $this->branch($branch))->values()->all();
        $data['main_branch'] = collect($data['branches'])->firstWhere('is_main_branch', true) ?? ($data['branches'][0] ?? null);
        foreach (['address', 'lat', 'lng'] as $field) $data[$field] = $data['main_branch'][$field] ?? null;
        return $data;
    }

    public function present(Business $business): array
    {
        $data = $this->summary($business);
        $branchIds = array_column($data['branches'], 'id');
        $data['professionals'] = $business->professionals
            ->filter(fn (Professional $professional): bool => $professional->is_active && (int) $professional->business_id === $business->id)
            ->map(fn (Professional $professional): array => $professional->only(ProfessionalProfile::PUBLIC_FIELDS))->values()->all();
        $professionalIds = array_column($data['professionals'], 'id');
        $data['resources'] = $business->resources
            ->filter(fn (Resource $resource): bool => $resource->is_active && (int) $resource->business_id === $business->id && in_array($resource->branch_id, $branchIds, true))
            ->map(fn (Resource $resource): array => $this->resource($resource))->values()->all();
        $resourceIds = array_column($data['resources'], 'id');
        $data['services'] = $business->services
            ->filter(fn (Service $service): bool => $service->is_active && (int) $service->business_id === $business->id)
            ->map(fn (Service $service): array => $this->service($service, $professionalIds, $resourceIds))->values()->all();
        $serviceIds = array_column($data['services'], 'id');
        $data['promotions'] = $business->promotions
            ->filter(fn (Promotion $promotion): bool => $promotion->is_active && ($promotion->services->isEmpty() || $promotion->services->pluck('id')->intersect($serviceIds)->isNotEmpty()))
            ->map(fn (Promotion $promotion): array => $this->promotion($promotion, $serviceIds))->values()->all();
        $data['reviews'] = $business->reviews->filter(fn (Review $review): bool => $review->is_active)
            ->map(fn (Review $review): array => $review->only(self::REVIEW_FIELDS))->values()->all();
        $data['social_links'] = $business->socialLinks->where('is_active', true)
            ->map(fn ($link): array => $link->only(['platform', 'url']))->values()->all();
        foreach (['whatsapp', 'instagram'] as $platform) {
            $data[$platform] = collect($data['social_links'])->firstWhere('platform', $platform)['url'] ?? '';
        }
        $data['opening_hours'] = $this->openingHours($data['main_branch']['schedules'] ?? []);
        $data['currency'] = 'COP';
        return $data;
    }

    private function branch(BusinessBranch $branch): array
    {
        $data = $branch->only(['id', 'business_id', 'name', 'address', 'city_id', 'lat', 'lng', 'phone', 'is_main_branch', 'is_active']);
        if ($branch->relationLoaded('schedules')) {
            $data['schedules'] = $branch->schedules->map(fn (array $schedule): array => array_intersect_key($schedule,
                array_flip(['id', 'branch_id', 'day', 'is_closed', 'open_time', 'close_time'])))->values()->all();
        }
        return $data;
    }

    private function resource(Resource $resource): array
    {
        return [...$resource->only(['id', 'business_id', 'branch_id', 'name', 'type', 'description', 'capacity', 'image_url', 'is_active']),
            'attributes' => array_intersect_key($resource->attributes ?? [], array_flip(['sport_type', 'surface', 'covered']))];
    }

    private function service(Service $service, array $professionalIds, array $resourceIds): array
    {
        $data = $service->only(self::SERVICE_FIELDS);
        $data['currency'] = 'COP';
        $data['professionals'] = $service->professionals
            ->filter(fn (array $professional): bool => in_array($professional['id'], $professionalIds, true))
            ->map(fn (array $professional): array => array_intersect_key($professional,
                array_flip([...ProfessionalProfile::PUBLIC_FIELDS, 'branch_ids'])))->values()->all();
        $data['resources'] = $service->resources->filter(fn (Resource $resource): bool => in_array($resource->id, $resourceIds, true))
            ->map(fn (Resource $resource): array => $this->resource($resource))->values()->all();
        return $data;
    }

    private function promotion(Promotion $promotion, array $serviceIds): array
    {
        return [...$promotion->only(['id', 'business_id', 'title', 'description', 'discount', 'type', 'min_purchase',
            'max_discount', 'per_user_limit', 'start_date', 'end_date', 'promo_code', 'image_url', 'is_active']),
            'services' => $promotion->services->whereIn('id', $serviceIds)->map(fn ($service): array => ['id' => $service->id])->values()->all()];
    }

    private function openingHours(array $schedules): string
    {
        $days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        $english = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        $hours = [];
        foreach ($schedules as $schedule) {
            $day = (string) $schedule['day'];
            $index = preg_match('/^[0-6]$/', $day) ? (int) $day : array_search(strtoupper($day), $english, true);
            if ($index === false) $index = array_search($day, $days, true);
            if ($index !== false) $hours[$days[$index]] = ['active' => ! $schedule['is_closed'],
                'start' => $schedule['open_time'], 'end' => $schedule['close_time']];
        }
        return json_encode($hours, JSON_THROW_ON_ERROR);
    }
}
