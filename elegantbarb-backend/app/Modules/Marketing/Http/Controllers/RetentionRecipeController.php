<?php

namespace App\Modules\Marketing\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Business\Models\Business;
use App\Modules\Marketing\Services\RetentionRecipeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class RetentionRecipeController extends Controller
{
    public function index(Request $request, int $businessId): JsonResponse { return ServiceResponse::success(app(RetentionRecipeService::class)->inspect($this->business($request, $businessId)))->toJsonResponse(); }
    public function save(Request $request, int $businessId): JsonResponse
    {
        $business = $this->business($request, $businessId);
        $data = $request->validate(['kind' => 'required|in:RETURN_REMINDER,MEMBERSHIP_EXPIRING,OPEN_SLOTS_PROMOTION', 'enabled' => 'required|boolean',
            'inactive_days' => 'required|integer|min:7|max:365', 'lead_days' => 'required|integer|min:1|max:30', 'frequency_days' => 'required|integer|min:7|max:365',
            'minimum_discount' => 'required|integer|min:0|max:50', 'maximum_discount' => 'required|integer|min:0|max:50|gte:minimum_discount']);
        DB::table('marketing.retention_recipes')->updateOrInsert(['business_id' => $businessId, 'kind' => $data['kind']], [...$data, 'created_at' => now(), 'updated_at' => now()]);
        return ServiceResponse::success(app(RetentionRecipeService::class)->inspect($business))->toJsonResponse();
    }
    public function scan(Request $request, int $businessId): JsonResponse
    {
        $business = $this->business($request, $businessId);
        app(RetentionRecipeService::class)->scan($business);
        return ServiceResponse::success(app(RetentionRecipeService::class)->inspect($business))->toJsonResponse();
    }
    public function approve(Request $request, int $businessId, int $id): JsonResponse
    {
        $business = $this->business($request, $businessId);
        $data = $request->validate(['discount' => 'nullable|integer|min:0|max:50']);
        return ServiceResponse::success(app(RetentionRecipeService::class)->approve($business, $request->user(), $id, $data['discount'] ?? null))->toJsonResponse();
    }
    public function click(Request $request, int $id): JsonResponse
    {
        app(\App\Modules\Marketing\Services\RetentionAttributionService::class)->click($request->user(), $id);
        return ServiceResponse::success(null)->toJsonResponse();
    }
    private function business(Request $request, int $id): Business
    {
        $business = Business::findOrFail($id);
        abort_unless($request->user()->role === 'SUPERADMIN' || ($request->user()->role === 'ADMIN_BARBERIA' && (int) $business->owner_user_id === $request->user()->id), 403);
        return $business;
    }
}
