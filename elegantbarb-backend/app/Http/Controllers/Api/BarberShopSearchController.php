<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Business\Models\Business;
use App\Enums\ServiceCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BarberShopSearchController extends Controller
{
    public function search(Request $request)
    {
        try {
            $lat     = $request->input('lat');
            $lng     = $request->input('lng');
            $radius  = (float)$request->input('radius', 10);
            $search  = $request->input('search');
            $services = $request->input('services');
            $rating  = $request->input('rating');

            $query = Business::query()
                ->with(['branches', 'services', 'reviews'])
                ->where('is_active', true);

            // ── Text Search ──────────────────────────────────────────────────
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            // ── Services Filter (case-insensitive name search) ─────────────────────
            if ($services) {
                $terms = array_filter(explode(',', $services));
                if (!empty($terms)) {
                    $query->whereHas('services', function ($sq) use ($terms) {
                        $sq->where(function ($nameQ) use ($terms) {
                            foreach ($terms as $term) {
                                $nameQ->orWhereRaw('LOWER(name) LIKE ?', ['%' . strtolower(trim($term)) . '%']);
                            }
                        });
                    });
                }
            }

            $shops = $query->get();

            // ── Distance & Rating filter in PHP (safe for all DB engines) ────
            $shops = $shops->map(function ($shop) use ($lat, $lng) {
                $avgRating = $shop->reviews->avg('rating') ?? 0;
                $shop->computed_rating = round($avgRating, 1);
                $shop->reviews_count   = $shop->reviews->count();

                if ($lat && $lng) {
                    $branch = $shop->branches->first();
                    if ($branch && $branch->lat && $branch->lng) {
                        $shop->distance = $this->haversine($lat, $lng, $branch->lat, $branch->lng);
                    } else {
                        $shop->distance = null;
                    }
                } else {
                    $shop->distance = null;
                }
                return $shop;
            });

            // ── Filter by radius ─────────────────────────────────────────────
            if ($lat && $lng) {
                $shops = $shops->filter(fn($s) => $s->distance !== null && $s->distance <= $radius);
            }

            // ── Filter by rating ─────────────────────────────────────────────
            if ($rating && is_numeric($rating)) {
                $shops = $shops->filter(fn($s) => $s->computed_rating >= (float)$rating);
            }

            // ── Sort ─────────────────────────────────────────────────────────
            if ($lat && $lng) {
                $shops = $shops->sortBy('distance');
            } else {
                $shops = $shops->sortByDesc('computed_rating');
            }

            $user = Auth::user();
            $favoriteIds = [];
            if ($user && $user->cliente_id) {
                $favoriteIds = $user->cliente->favoriteBusinesses()->pluck('business.businesses.id')->toArray();
            }

            return response()->json(
                $shops->values()->map(fn($shop) => [
                    'id'            => $shop->id,
                    'name'          => $shop->name,
                    'address'       => $shop->branches->first()?->address,
                    'lat'           => (float) ($shop->branches->first()?->lat ?? 0),
                    'lng'           => (float) ($shop->branches->first()?->lng ?? 0),
                    'rating'        => $shop->computed_rating,
                    'reviews_count' => $shop->reviews_count,
                    'distance'      => $shop->distance !== null ? round($shop->distance, 1) : null,
                    'is_featured'   => false,
                    'verified'      => (bool) ($shop->verified ?? false),
                    'photo_url'     => $shop->logo_url,
                    'banner_url'    => $shop->banner_url,
                    'city'          => null,
                    'is_favorite'   => in_array($shop->id, $favoriteIds),
                ])
            );

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // ── Endpoint: list available service categories ───────────────────────────
    public function categories()
    {
        return response()->json(ServiceCategory::values());
    }

    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R     = 6371;
        $dLat  = deg2rad($lat2 - $lat1);
        $dLon  = deg2rad($lon2 - $lon1);
        $a     = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
