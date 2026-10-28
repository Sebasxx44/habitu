<?php

namespace App\Modules\Business\Services;

use App\Core\DTOs\ServiceResponse;
use App\Models\User;
use App\Modules\Business\DTOs\PublicBusinessProfile;
use App\Modules\Business\Models\Business;
use App\Services\BusinessAccessService;

final class PublicCatalogService
{
    public function __construct(private BusinessService $businesses, private PublicBusinessProfile $profiles, private BusinessAccessService $access) {}

    public function all(array $filters, ?User $viewer = null): ServiceResponse
    {
        if ($viewer?->role === User::ROLE_SUPERADMIN) return $this->businesses->all($filters);
        $owned = $viewer?->role === User::ROLE_ADMIN ? $this->access->businessIds($viewer) : [];
        $query = Business::with(['category', 'branches'])
            ->where(fn ($scope) => $scope->where('is_active', true)->when($owned, fn ($owner) => $owner->orWhereIn('id', $owned)))
            ->when(isset($filters['category_id']), fn ($scope) => $scope->where('business_category_id', $filters['category_id']))
            ->when(! empty($filters['search']), fn ($scope) => $scope->where('name', 'ilike', '%'.$filters['search'].'%'));
        if (isset($filters['active']) && $filters['active'] !== '') $query->where('is_active', filter_var($filters['active'], FILTER_VALIDATE_BOOLEAN));
        $rows = $query->orderBy('id')->limit(100)->get()->map(fn (Business $business): Business|array =>
            in_array($business->id, $owned, true) ? $business : $this->profiles->summary($business));
        return ServiceResponse::success($rows, 'Negocios obtenidos');
    }

    public function find(int $id, ?User $viewer = null, bool $publicOnly = true): ServiceResponse
    {
        $business = Business::findOrFail($id);
        $private = ! $publicOnly && $viewer && in_array($viewer->role, [User::ROLE_SUPERADMIN, User::ROLE_ADMIN], true)
            && $this->access->canAccess($viewer, $business);
        abort_unless($business->is_active || $private, 404);
        $response = $this->businesses->find($id);
        if ($response->success && ! $private) $response->data = $this->profiles->present($response->data);
        return $response;
    }

    public function bySlug(string $slug): ServiceResponse
    {
        $business = Business::where('slug', $slug)->where('is_active', true)->firstOrFail();
        return $this->find($business->id);
    }
}
