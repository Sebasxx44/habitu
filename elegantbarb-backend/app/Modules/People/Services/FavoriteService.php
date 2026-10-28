<?php

namespace App\Modules\People\Services;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\AccountFavorite;
use App\Modules\People\Models\Professional;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class FavoriteService
{
    public const TYPES = ['business', 'service', 'professional'];

    public function listing(User $user, ?string $type = null, int $perPage = 24): LengthAwarePaginator
    {
        $query = AccountFavorite::where('user_id', $user->id)
            ->with(['business.branches', 'service.business.branches', 'professional.business.branches'])
            ->when($type, fn ($query) => $query->whereNotNull($type.'_id'));
        return $query->orderByDesc('id')->paginate($perPage)->through(fn (AccountFavorite $favorite) => $this->card($favorite));
    }

    public function save(User $user, string $type, int $id): void
    {
        $this->target($type, $id);
        AccountFavorite::query()->insertOrIgnore([
            'user_id' => $user->id, $type.'_id' => $id, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function remove(User $user, string $type, int $id): void
    {
        abort_unless(in_array($type, self::TYPES, true), 404);
        AccountFavorite::where('user_id', $user->id)->where($type.'_id', $id)->delete();
    }

    public function legacyToggle(User $user, int $businessId): bool
    {
        return DB::transaction(function () use ($user, $businessId) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $exists = AccountFavorite::where('user_id', $user->id)->where('business_id', $businessId)->exists();
            if ($exists) $this->remove($user, 'business', $businessId);
            else $this->save($user, 'business', $businessId);
            return ! $exists;
        });
    }

    private function target(string $type, int $id): Model
    {
        $model = match ($type) {
            'business' => Business::class,
            'service' => Service::class,
            'professional' => Professional::class,
            default => abort(404),
        };
        $target = $model::where('is_active', true)->findOrFail($id);
        if ($type !== 'business') abort_unless($target->business?->is_active, 404);
        return $target;
    }

    private function card(AccountFavorite $favorite): array
    {
        $type = $favorite->service_id ? 'service' : ($favorite->professional_id ? 'professional' : 'business');
        $record = $favorite->{$type};
        $business = $type === 'business' ? $record : $record?->business;
        $available = (bool) ($record?->is_active && $business?->is_active);
        $branch = $business?->branches->firstWhere('is_main_branch', true) ?? $business?->branches->first();
        $query = $type === 'service' ? '?book=1&service_id='.$favorite->service_id : ($type === 'professional' ? '?book=1&professional_id='.$favorite->professional_id : '');
        return [
            'type' => $type, 'id' => (int) $favorite->{$type.'_id'},
            'name' => $record?->name, 'business_id' => $business?->id, 'business_name' => $business?->name,
            'image_url' => match ($type) { 'business' => $record?->logo_url, 'service' => $record?->image_url, default => $record?->photo_url },
            'address' => $branch?->address, 'available' => $available,
            'url' => $available ? '/cliente/business/'.$business->id.$query : null,
            'saved_at' => $favorite->created_at?->toIso8601String(),
        ];
    }
}
