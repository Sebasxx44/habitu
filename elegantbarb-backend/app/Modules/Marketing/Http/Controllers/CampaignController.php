<?php

namespace App\Modules\Marketing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Core\DTOs\ServiceResponse;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    public function index(Request $request)
    {
        $query = Campaign::query()
            ->when($request->business_id, fn($q, $id) => $q->where('business_id', $id))
            ->orderBy('created_at', 'desc');
        return ServiceResponse::success($query->paginate(50), 'Campañas obtenidas')->toJsonResponse();
    }

    public function show($id)
    {
        $camp = Campaign::find($id);
        if (!$camp) return ServiceResponse::error('Campaña no encontrada', null, 404)->toJsonResponse();
        return ServiceResponse::success($camp, 'Campaña obtenida')->toJsonResponse();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'business_id' => ['required', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Business\Models\Business::class, 'id')],
            'subject' => 'required|string',
            'body' => 'required|string|max:1000000',
            'type' => 'nullable|string',
        ]);
        $data['user_id'] = $request->user()?->id;
        $data['status'] = 'DRAFT';
        $data['target_role'] = 'CLIENTE';
        $camp = app(\App\Services\CampaignService::class)->createCampaign($data);
        return ServiceResponse::success($camp, 'Campaña creada', 201)->toJsonResponse();
    }

    public function update(Request $request, $id)
    {
        $camp = Campaign::find($id);
        if (!$camp) return ServiceResponse::error('Campaña no encontrada', null, 404)->toJsonResponse();
        abort_unless($camp->status === 'DRAFT', 409, 'Solo puedes editar borradores.');
        $data = $request->validate(['subject' => 'sometimes|required|string|max:255', 'body' => 'sometimes|required|string|max:1000000', 'type' => 'sometimes|in:PROMO,NEWS,REMINDER,CUSTOM']);
        if (isset($data['body'])) $data['body'] = app(\App\Services\CampaignHtmlService::class)->sanitize($data['body']);
        app(\App\Services\CampaignService::class)->updateCampaign($camp, $data);
        return ServiceResponse::success($camp, 'Campaña actualizada')->toJsonResponse();
    }

    public function destroy($id)
    {
        $camp = Campaign::find($id);
        if (!$camp) return ServiceResponse::error('Campaña no encontrada', null, 404)->toJsonResponse();
        app(\App\Services\CampaignService::class)->deleteCampaign($camp->id);
        return ServiceResponse::success(null, 'Campaña eliminada')->toJsonResponse();
    }
}
