<?php

namespace App\Modules\People\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\People\Models\AccountFavorite;
use App\Modules\People\Services\FavoriteService;
use App\Core\DTOs\ServiceResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function __construct(private FavoriteService $service) {}

    public function index(Request $request)
    {
        $data = $request->validate(['type' => 'nullable|in:business,service,professional', 'per_page' => 'sometimes|integer|min:1|max:50', 'page' => 'sometimes|integer|min:1']);
        return ServiceResponse::success($this->service->listing($request->user(), $data['type'] ?? null, $data['per_page'] ?? 24))->toJsonResponse();
    }

    public function identifiers(Request $request)
    {
        $rows = AccountFavorite::where('user_id', $request->user()->id)->get(['business_id', 'service_id', 'professional_id']);
        return ServiceResponse::success([
            'business' => $rows->pluck('business_id')->filter()->values(),
            'service' => $rows->pluck('service_id')->filter()->values(),
            'professional' => $rows->pluck('professional_id')->filter()->values(),
        ])->toJsonResponse();
    }

    public function store(Request $request, string $type, int $id)
    {
        $this->service->save($request->user(), $type, $id);
        return ServiceResponse::success(['is_favorite' => true])->toJsonResponse();
    }

    public function destroy(Request $request, string $type, int $id)
    {
        $this->service->remove($request->user(), $type, $id);
        return ServiceResponse::success(['is_favorite' => false])->toJsonResponse();
    }
}
