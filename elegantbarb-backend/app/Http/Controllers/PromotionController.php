<?php

namespace App\Http\Controllers;

use App\Modules\Marketing\Models\Promotion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PromotionController extends Controller
{
    public function index(Request $request)
    {
        $promotions = Promotion::where('business_id', auth()->user()->barber_shop_id ?? 1)
            ->withCount('usages')
            ->get();
        return response()->json($promotions);
    }

    public function stats(Promotion $promotion)
    {
        $usages = $promotion->usages()->with('user')->get();

        $stats = [
            'total_redemptions' => $usages->count(),
            'total_saved' => $usages->sum('discount_amount'),
            'redemptions_by_month' => $usages->groupBy(function($item) {
                return $item->created_at->format('Y-m');
            })->map(function($group) {
                return $group->count();
            }),
            'recent_redemptions' => $usages->sortByDesc('created_at')->take(10)->values(),
        ];

        return response()->json($stats);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
            'discount' => 'required|numeric',
            'type' => 'required|in:PERCENTAGE,FIXED',
            'starts_at' => 'required|date',
            'ends_at' => 'required|date',
            'is_active' => 'boolean',
            'code' => 'nullable|string',
            'services' => 'nullable|array',
            'services.*.id' => 'required|exists:pgsql.catalog.services,id',
            'services.*.discount' => 'required|numeric',
            'services.*.type' => 'required|in:PORCENTAJE,FIJO',
        ]);

        return DB::transaction(function () use ($data) {
            $serviceIds = collect($data['services'] ?? [])->pluck('id')->toArray();
            unset($data['services']);

            $data['business_id'] = auth()->user()->barber_shop_id ?? 1;
            $data['value'] = $data['discount'];
            $data['applicable_service_ids'] = $serviceIds;
            unset($data['discount']);

            $promotion = Promotion::create($data);

            return response()->json($promotion, 201);
        });
    }

    public function show(Promotion $promotion)
    {
        return response()->json($promotion);
    }

    public function update(Request $request, Promotion $promotion)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string',
            'description' => 'nullable|string',
            'discount' => 'sometimes|required|numeric',
            'type' => 'sometimes|required|in:PERCENTAGE,FIXED',
            'starts_at' => 'sometimes|required|date',
            'ends_at' => 'sometimes|required|date',
            'is_active' => 'boolean',
            'code' => 'nullable|string',
            'services' => 'nullable|array',
            'services.*.id' => 'required|exists:pgsql.catalog.services,id',
            'services.*.discount' => 'required|numeric',
            'services.*.type' => 'required|in:PORCENTAJE,FIJO',
        ]);

        return DB::transaction(function () use ($data, $promotion) {
            $services = $data['services'] ?? null;
            unset($data['services']);

            if (isset($data['discount'])) {
                $data['value'] = $data['discount'];
                unset($data['discount']);
            }

            if ($services !== null) {
                $data['applicable_service_ids'] = collect($services)->pluck('id')->toArray();
            }

            $promotion->update($data);

            return response()->json($promotion);
        });
    }

    public function destroy(Promotion $promotion)
    {
        $promotion->delete();
        return response()->json(null, 204);
    }
}
