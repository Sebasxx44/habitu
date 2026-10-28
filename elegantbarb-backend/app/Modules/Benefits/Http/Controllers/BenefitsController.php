<?php

declare(strict_types=1);

namespace App\Modules\Benefits\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Benefits\Services\BenefitsCatalogService;
use App\Modules\Benefits\Services\LoyaltyBenefitService;
use App\Modules\Subscriptions\Services\MembershipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class BenefitsController extends Controller
{
    public function index(Request $request, BenefitsCatalogService $catalog): JsonResponse
    {
        $filters = $request->validate(['q' => 'nullable|string|max:100', 'business_id' => 'nullable|integer|min:1', 'category_id' => 'nullable|integer|min:1']);
        return ServiceResponse::success($catalog->catalog($request->user(), $filters))->toJsonResponse()->header('Cache-Control', 'private, no-store');
    }

    public function enroll(Request $request, int $program, LoyaltyBenefitService $service): JsonResponse
    {
        return ServiceResponse::success($service->enroll($request->user(), $program), 'Tarjeta activada', 201)->toJsonResponse();
    }

    public function subscribe(Request $request, int $plan, MembershipService $service): JsonResponse
    {
        return $service->subscribeForUser($request->user()->id, $plan)->toJsonResponse();
    }

    public function cancel(Request $request, int $membership, MembershipService $service): JsonResponse
    {
        return $service->cancelForUser($membership, $request->user()->id)->toJsonResponse();
    }
}
