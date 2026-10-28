<?php

declare(strict_types=1);

namespace App\Modules\Finance\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Core\Support\Money;
use App\Http\Controllers\Controller;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Finance\Models\BookingPaymentPolicy;
use App\Modules\Finance\Models\CheckoutOrder;
use App\Modules\Finance\Services\CheckoutRefundService;
use App\Modules\Finance\Services\ReservationCheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ReservationCheckoutController extends Controller
{
    public function __construct(private ReservationCheckoutService $checkout) {}

    public function policy(Request $request): JsonResponse
    {
        $data = $request->validate(['business_id' => 'required|integer|min:1']);
        app(\App\Modules\Business\Services\BusinessService::class)->assertBookable((int) $data['business_id']);
        Business::where('is_active', true)->findOrFail($data['business_id']);
        return ServiceResponse::success($this->checkout->policy((int) $data['business_id']))->toJsonResponse();
    }

    public function updatePolicy(Request $request, int $businessId): JsonResponse
    {
        app(\App\Modules\Business\Services\BusinessService::class)->assertBookable($businessId);
        $business = Business::findOrFail($businessId);
        abort_unless($request->user()->role === 'SUPERADMIN' || ($request->user()->role === 'ADMIN_BARBERIA' && (int) $business->owner_user_id === $request->user()->id), 403);
        $data = $request->validate(['allowed_modes' => 'required|array|min:1|max:3', 'allowed_modes.*' => 'required|distinct|in:FULL,DEPOSIT,ON_SITE',
            'deposit_percentage' => 'nullable|integer|min:1|max:99',
            'hold_minutes' => 'required|integer|min:5|max:30', 'cancellation_terms' => 'required|string|min:10|max:3000']);
        if (in_array('DEPOSIT', $data['allowed_modes'], true) && empty($data['deposit_percentage'])) abort(422, 'Indica el porcentaje del anticipo.');
        DB::transaction(function () use ($businessId, $request, $data) {
            Business::whereKey($businessId)->lockForUpdate()->firstOrFail();
            $policy = BookingPaymentPolicy::find($businessId);
            BookingPaymentPolicy::updateOrCreate(['business_id' => $businessId], array_merge($data,
                ['version' => ($policy?->version ?? 0) + 1, 'updated_by' => $request->user()->id]));
        });
        return ServiceResponse::success($this->checkout->policy($businessId))->toJsonResponse();
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'CLIENTE', 403);
        $data = $request->validate(['business_id' => 'required|integer|min:1', 'branch_id' => 'required|integer|min:1',
            'service_id' => 'required|integer|min:1', 'professional_id' => 'nullable|integer|min:1', 'resource_id' => 'nullable|integer|min:1',
            'date' => 'required|date_format:Y-m-d', 'start_time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:1|max:1440', 'participants' => 'nullable|integer|min:1|max:10000',
            'promo_code' => 'nullable|string|max:255', 'notes' => 'nullable|string|max:2000', 'source' => 'nullable|in:web,app,widget',
            'idempotency_key' => 'required|uuid', 'expected_total' => 'required|numeric|min:0|decimal:0,2',
            'payment_mode' => 'required|in:FULL,DEPOSIT,ON_SITE', 'accepted_terms' => 'required|accepted', 'expected_policy_version' => 'required|integer|min:1']);
        return ServiceResponse::success($this->checkout->create($request->user(), $data))->toJsonResponse();
    }

    public function refund(Request $request, string $id): JsonResponse
    {
        $order = CheckoutOrder::where('user_id', $request->user()->id)->where('purpose', 'reservation')->findOrFail($id);
        $appointment = Appointment::findOrFail($order->target_id);
        abort_unless($appointment->getRawOriginal('status') === 'CANCELLED', 422, 'Cancela la reserva según sus condiciones antes de solicitar una devolución.');
        $data = $request->validate(['amount' => 'required|numeric|min:0.01|decimal:0,2', 'idempotency_key' => 'required|uuid', 'reason' => 'required|string|min:5|max:1000']);
        $refunds = app(CheckoutRefundService::class);
        return ServiceResponse::success($refunds->present($refunds->request($order, Money::minor($data['amount']), $data['idempotency_key'], $data['reason'])),
            'Solicitud registrada. La devolución al medio original requiere procesamiento del proveedor; todavía no está completada.')->toJsonResponse();
    }
}
