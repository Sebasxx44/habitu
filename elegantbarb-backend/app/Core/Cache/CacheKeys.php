<?php

namespace App\Core\Cache;

class CacheKeys
{
    public static function recommendations(int $userId): string
    {
        return "recommendations.user.{$userId}";
    }

    public static function businessesNearby(float $lat, float $lng, int $radiusKm = 10): string
    {
        $latKey = round($lat, 2);
        $lngKey = round($lng, 2);
        return "businesses.nearby.{$latKey}.{$lngKey}.{$radiusKm}";
    }

    public static function businessDetail(int $businessId): string
    {
        return "business.detail.{$businessId}";
    }

    public static function categories(): string
    {
        return 'categories.all';
    }

    public static function popularServices(?int $businessId = null): string
    {
        return $businessId ? "popular.services.business.{$businessId}" : 'popular.services.global';
    }

    public static function professionalAvailability(int $professionalId, string $date): string
    {
        return "professional.{$professionalId}.availability.{$date}";
    }

    public static function adsForPlacement(string $placement): string
    {
        return "ads.placement.{$placement}";
    }

    public static function promotions(): string
    {
        return 'promotions.active';
    }

    public static function subscriptionPlans(): string
    {
        return 'subscription.plans.active';
    }
}
