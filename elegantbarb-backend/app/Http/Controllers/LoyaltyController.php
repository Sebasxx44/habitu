<?php

namespace App\Http\Controllers;

use App\Services\LoyaltyService;
use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    protected $loyaltyService;

    public function __construct(LoyaltyService $loyaltyService)
    {
        $this->loyaltyService = $loyaltyService;
    }

    public function index(Request $request)
    {
        $shopId = $request->user()->barber_shop_id;
        $filters = $request->only(['search', 'status', 'program_id']);
        
        $cards = $this->loyaltyService->getCards($shopId, $filters);
        return response()->json($cards);
    }

    public function show(Request $request, $id)
    {
        $shopId = $request->user()->barber_shop_id;
        $detail = $this->loyaltyService->getCardDetail($shopId, $id);
        return response()->json($detail);
    }

    public function stats(Request $request)
    {
        $shopId = $request->user()->barber_shop_id;
        $stats = $this->loyaltyService->getStats($shopId);
        return response()->json($stats);
    }

    public function programs(Request $request)
    {
        $shopId = $request->user()->barber_shop_id;
        $programs = $this->loyaltyService->getPrograms($shopId);
        return response()->json($programs);
    }

    public function storeProgram(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'reward_description' => 'required|string',
            'stamps_required' => 'required|integer|min:1',
            'professional_id' => 'nullable|integer',
            'service_id' => 'nullable|integer',
        ]);

        $shopId = $request->user()->barber_shop_id;
        $program = $this->loyaltyService->createProgram($shopId, $validated);

        return response()->json($program);
    }

    public function updateProgram(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'reward_description' => 'required|string',
            'stamps_required' => 'required|integer|min:1',
            'professional_id' => 'nullable|integer',
            'service_id' => 'nullable|integer',
        ]);

        $shopId = $request->user()->barber_shop_id;
        try {
            $program = $this->loyaltyService->updateProgram($shopId, $id, $validated);
            return response()->json($program);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    public function deleteProgram(Request $request, $id)
    {
        $shopId = $request->user()->barber_shop_id;
        try {
            $this->loyaltyService->deleteProgram($shopId, $id);
            return response()->json(['message' => 'Program deleted']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    public function addStamp(Request $request, $cardId)
    {
        $shopId = $request->user()->barber_shop_id;
        $card = $this->loyaltyService->addStamp($shopId, $cardId);
        
        return response()->json($card);
    }

    public function redeemReward(Request $request, $cardId)
    {
        $shopId = $request->user()->barber_shop_id;
        try {
            $card = $this->loyaltyService->redeemReward($shopId, $cardId);
            return response()->json($card);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
