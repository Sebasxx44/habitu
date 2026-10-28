<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\People\Models\AccountFavorite;
use App\Modules\People\Services\FavoriteService;
use Illuminate\Http\Request;

/** Compatibility routes use the account-wide store shared by all favorite types. */
class FavoriteShopController extends Controller
{
    public function __construct(private FavoriteService $service) {}

    public function toggle(Request $request, int $shopId)
    {
        return response()->json(['is_favorite' => $this->service->legacyToggle($request->user(), $shopId)]);
    }

    public function index(Request $request)
    {
        $favorites = AccountFavorite::where('user_id', $request->user()->id)->whereNotNull('business_id')
            ->with(['business' => fn ($query) => $query->where('is_active', true)->with('branches')->withAvg(['reviews' => fn ($reviews) => $reviews->where('is_active', true)], 'rating')->withCount(['reviews' => fn ($reviews) => $reviews->where('is_active', true)])])->get();
        return response()->json($favorites->filter(fn ($favorite) => $favorite->business)->map(fn ($favorite) => [
            'id' => $favorite->business_id, 'name' => $favorite->business->name,
            'address' => $favorite->business->branches->first()?->address,
            'lat' => $favorite->business->branches->first()?->lat,
            'lng' => $favorite->business->branches->first()?->lng,
            'rating' => $favorite->business->reviews_avg_rating === null ? null : round($favorite->business->reviews_avg_rating, 1),
            'reviews_count' => $favorite->business->reviews_count,
            'photo_url' => $favorite->business->logo_url, 'banner_url' => $favorite->business->banner_url,
            'is_favorite' => true,
        ])->values());
    }
}
