<?php

namespace App\Modules\Marketing\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Core\Support\Money;
use App\Http\Controllers\Controller;
use App\Modules\Business\Models\Business;
use App\Modules\Marketing\Services\ReferralService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ReferralController extends Controller
{
    public function index(Request $request): JsonResponse { return ServiceResponse::success(app(ReferralService::class)->summary($request->user()))->toJsonResponse(); }
    public function apply(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => 'required|string|max:30']);
        app(ReferralService::class)->attribute($request->user(), $data['code']);
        return ServiceResponse::success(app(ReferralService::class)->summary($request->user()))->toJsonResponse();
    }
    public function program(Request $request, int $businessId): JsonResponse
    {
        $business = Business::findOrFail($businessId);
        abort_unless($request->user()->role === 'SUPERADMIN' || ($request->user()->role === 'ADMIN_BARBERIA' && (int) $business->owner_user_id === $request->user()->id), 403);
        if ($request->isMethod('PUT')) {
            $data = $request->validate(['enabled' => 'required|boolean', 'reward' => 'required|numeric|min:0|max:1000000|decimal:0,2',
                'minimum_paid' => 'required|numeric|min:0|max:100000000|decimal:0,2', 'currency' => 'required|string|size:3',
                'validity_days' => 'required|integer|min:1|max:180', 'qualification_days' => 'required|integer|min:1|max:90', 'terms' => 'required|string|min:10|max:2000']);
            abort_unless($data['currency'] === ($business->currency ?? 'COP'), 422, 'La moneda debe coincidir con el negocio.');
            DB::table('marketing.referral_programs')->updateOrInsert(['business_id' => $businessId], ['enabled' => $data['enabled'],
                'reward_minor' => Money::minor($data['reward']), 'minimum_paid_minor' => Money::minor($data['minimum_paid']), 'currency' => $data['currency'],
                'validity_days' => $data['validity_days'], 'qualification_days' => $data['qualification_days'], 'terms' => $data['terms'], 'created_at' => now(), 'updated_at' => now()]);
        }
        return ServiceResponse::success(['currency' => $business->currency ?? 'COP', 'program' => DB::table('marketing.referral_programs')->where('business_id', $businessId)->first()])->toJsonResponse();
    }
    public function preferences(Request $request): JsonResponse
    {
        if ($request->isMethod('PUT')) {
            $data = $request->validate(['promotions_enabled' => 'required|boolean', 'timezone' => 'required|timezone',
                'contact_start' => 'required|date_format:H:i', 'contact_end' => 'required|date_format:H:i|after:contact_start']);
            DB::table('marketing.contact_preferences')->updateOrInsert(['user_id' => $request->user()->id], [...$data, 'created_at' => now(), 'updated_at' => now()]);
        }
        $preferences = DB::table('marketing.contact_preferences')->where('user_id', $request->user()->id)->first();
        return ServiceResponse::success(['promotions_enabled' => $preferences?->promotions_enabled ?? false,
            'timezone' => $preferences?->timezone ?? config('booking.timezone'), 'contact_start' => substr($preferences?->contact_start ?? '09:00', 0, 5), 'contact_end' => substr($preferences?->contact_end ?? '20:00', 0, 5)])->toJsonResponse();
    }
}
