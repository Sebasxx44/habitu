<?php

namespace App\Modules\OnDemand\Services;

use App\Core\DTOs\ServiceResponse;
use App\Models\User;
use App\Modules\Booking\Services\ReservationContextService;
use App\Modules\OnDemand\Events\OnDemandStatusUpdated;
use App\Modules\OnDemand\Models\OnDemandAssignment;
use App\Modules\OnDemand\Models\OnDemandStatusHistory;
use Illuminate\Support\Facades\DB;

class OnDemandReassignmentService
{
    public function __construct(private ReservationContextService $context, private OnDemandOfferService $offers) {}

    public function reopen(int $id, User $user, string $reason): ServiceResponse
    {
        return DB::transaction(function () use ($id, $user, $reason) {
            $request = $this->context->resolve('on-demand', $id, $user, true);
            abort_unless($this->context->isManager($request, $user), 403);
            abort_unless(in_array($request->status, ['ACCEPTED', 'ON_THE_WAY'], true), 422, 'Solo se reasigna antes de iniciar el servicio.');
            $previousStatus = $request->status;
            $previousProfessional = $request->professional_id;
            $participantIds = $this->context->participants($request);
            OnDemandAssignment::where('request_id', $id)->whereIn('status', ['ACCEPTED', 'PENDING'])->update(['status' => 'CANCELLED', 'responded_at' => now()]);
            $request->update(['professional_id' => null, 'status' => 'SEARCHING', 'accepted_at' => null, 'arrived_at' => null,
                'search_expires_at' => now()->addMinutes(5), 'metadata' => array_merge($request->metadata ?? [], ['price_quote' => null])]);
            DB::table('booking.check_in_tokens')->where('reservation_kind', 'on-demand')->where('reservation_id', $id)->delete();
            OnDemandStatusHistory::create(['request_id' => $id, 'from_status' => $previousStatus, 'to_status' => 'SEARCHING',
                'changed_by' => $user->id, 'notes' => 'Reasignación supervisada; profesional previo #'.$previousProfessional.'. '.$reason]);
            foreach ($participantIds as $participantId) {
                \App\Modules\Platform\Models\Notification::create(['user_id' => $participantId, 'type' => 'on_demand_reassigned',
                    'title' => 'Nueva búsqueda de profesional', 'message' => 'La solicitud '.$request->request_code.' fue reasignada: '.$reason,
                    'data' => ['on_demand_request_id' => $id, 'status' => 'SEARCHING'], 'read' => false]);
            }
            event(new OnDemandStatusUpdated($request, $previousStatus, 'SEARCHING'));
            $this->offers->offer($id);
            return ServiceResponse::success($request->load('statusHistory'), 'Nueva búsqueda iniciada; requiere aceptación y no garantiza cobertura.');
        });
    }
}
