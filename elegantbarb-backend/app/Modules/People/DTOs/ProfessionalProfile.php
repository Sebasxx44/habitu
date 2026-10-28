<?php

namespace App\Modules\People\DTOs;

use App\Models\User;
use App\Modules\People\Models\Professional;
use App\Services\BusinessAccessService;

class ProfessionalProfile
{
    public const PUBLIC_FIELDS = ['id', 'business_id', 'name', 'specialty', 'bio', 'photo_url', 'social_links', 'is_active'];

    public function __construct(private BusinessAccessService $access) {}

    public function canViewPrivate(Professional $professional, ?User $viewer): bool
    {
        if (! $viewer) return false;
        if ($viewer->role === User::ROLE_SUPERADMIN) return true;
        if ($viewer->role === User::ROLE_PROFESSIONAL && (int) $professional->user_id === $viewer->id) return true;
        return $viewer->role === User::ROLE_ADMIN && $viewer->hasEffectivePermission('barbers.view')
            && $this->access->canAccess($viewer, $professional);
    }

    public function present(Professional $professional, ?User $viewer = null): array
    {
        if ($this->canViewPrivate($professional, $viewer)) return $professional->toArray();
        $data = $professional->only(self::PUBLIC_FIELDS);
        if ($professional->relationLoaded('business')) {
            $data['business'] = $professional->business?->only(['id', 'name', 'slug', 'logo_url']);
        }
        if ($professional->relationLoaded('availability')) $data['availability'] = $professional->availability->toArray();
        if ($professional->relationLoaded('portfolios')) $data['portfolios'] = $professional->portfolios->toArray();
        if ($professional->relationLoaded('services')) {
            $data['services'] = $professional->services->map(fn ($service) => $service->only([
                'id', 'business_id', 'name', 'description', 'price', 'duration_minutes', 'is_active',
            ]))->all();
        }
        return $data;
    }
}
