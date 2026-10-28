<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Platform\Services\AIChatbotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AIChatbotController extends Controller
{
    public function __construct(private AIChatbotService $service) {}

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'context_type' => 'nullable|string|in:GENERAL,BOOKING,ON_DEMAND,SUPPORT,STYLE_CONSULTATION',
            'locale' => 'nullable|in:es,en',
            'context_data' => 'nullable|array:business_id,branch_id,service_id,professional_id,resource_id,booking_model,duration_minutes,participants,date,date_to,time_from,time_to,max_price,lat,lng,zone,locale',
            ...$this->contextRules('context_data'),
        ]);

        $res = $this->service->startConversation(
            $request->user()->id,
            $data['context_type'] ?? 'GENERAL',
            array_replace($data['context_data'] ?? [], isset($data['locale']) ? ['locale' => $data['locale']] : [])
        );

        return $res->toJsonResponse();
    }

    public function send(Request $request, string $sessionId): JsonResponse
    {
        $data = $request->validate([
            'content' => 'required_without:image|nullable|string|max:2000',
            'image' => ['required_without:content', 'nullable', 'string', 'max:2000000', 'regex:/\Adata:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+\/=\r\n]+\z/'],
            'context' => 'nullable|array:business_id,branch_id,service_id,professional_id,resource_id,booking_model,duration_minutes,participants,date,date_to,time_from,time_to,max_price,lat,lng,zone,locale',
            ...$this->contextRules('context'),
        ]);

        $content = $data['content'] ?? 'Ha compartido una imagen.';

        $res = $this->service->sendMessage(
            $request->user()->id,
            $sessionId,
            $content,
            $data['image'] ?? null,
            $data['context'] ?? []
        );

        return $res->toJsonResponse();
    }

    public function show(Request $request, string $sessionId): JsonResponse
    {
        $res = $this->service->getConversation($request->user()->id, $sessionId);

        return $res->toJsonResponse();
    }

    public function history(Request $request): JsonResponse
    {
        $data = $request->validate(['limit' => 'sometimes|integer|min:1|max:50']);
        $res = $this->service->getHistory($request->user()->id, $data['limit'] ?? 20);

        return $res->toJsonResponse();
    }

    public function close(Request $request, string $sessionId): JsonResponse
    {
        $res = $this->service->closeConversation($request->user()->id, $sessionId);

        return $res->toJsonResponse();
    }

    public function destroy(Request $request, string $sessionId): JsonResponse
    {
        return $this->service->deleteConversation($request->user()->id, $sessionId)->toJsonResponse();
    }

    private function contextRules(string $prefix): array
    {
        $rules = [];
        foreach (['business_id', 'branch_id', 'service_id', 'professional_id', 'resource_id'] as $field) $rules[$prefix.'.'.$field] = 'nullable|integer|min:1';
        return [...$rules, $prefix.'.locale' => 'nullable|in:es,en', $prefix.'.booking_model' => 'nullable|in:professional,resource,direct,optional_professional,capacity',
            $prefix.'.duration_minutes' => 'nullable|integer|min:1|max:1440', $prefix.'.participants' => 'nullable|integer|min:1|max:10000',
            $prefix.'.date_to' => 'nullable|date_format:Y-m-d', $prefix.'.date' => 'nullable|date_format:Y-m-d',
            $prefix.'.time_from' => 'nullable|date_format:H:i', $prefix.'.time_to' => 'nullable|date_format:H:i',
            $prefix.'.max_price' => 'nullable|numeric|min:0|max:100000000', $prefix.'.zone' => 'nullable|string|max:100',
            $prefix.'.lat' => 'nullable|numeric|between:-90,90', $prefix.'.lng' => 'nullable|numeric|between:-180,180'];
    }
}
