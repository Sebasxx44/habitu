<?php

namespace App\Modules\Chat\Services;

use App\Core\DTOs\ServiceResponse;
use App\Models\User;
use App\Modules\Booking\Services\ReservationContextService;
use App\Modules\Chat\Models\Conversation;
use Illuminate\Support\Facades\DB;

class ReservationConversationService
{
    public function __construct(private ReservationContextService $context) {}

    public function open(string $kind, int $id, User $user): ServiceResponse
    {
        return DB::transaction(function () use ($kind, $id, $user) {
            $reservation = $this->context->resolve($kind, $id, $user, true);
            $field = $kind === 'appointment' ? 'appointment_id' : 'on_demand_request_id';
            $conversation = Conversation::firstOrCreate([$field => $id], [
                'type' => 'SUPPORT', 'subject' => $reservation->booking_code ?? $reservation->request_code,
                'business_id' => $reservation->business_id, 'is_active' => true,
            ]);
            $participants = $this->context->participants($reservation);
            if ($this->context->isManager($reservation, $user)) $participants[] = $user->id;
            $conversation->participants()->whereNotIn('user_id', $participants)->delete();
            foreach (array_unique($participants) as $participantId) {
                $conversation->participants()->firstOrCreate(['user_id' => $participantId]);
            }
            return ServiceResponse::success(['id' => $conversation->id, 'subject' => $conversation->subject,
                'retention_days' => 90, 'is_active' => $conversation->is_active], 'Conversación de la reserva');
        });
    }

    public function authorize(Conversation $conversation, int $userId): void
    {
        abort_unless($conversation->participants()->where('user_id', $userId)->exists(), 403);
        if ($conversation->appointment_id || $conversation->on_demand_request_id) {
            $user = User::findOrFail($userId);
            $this->context->resolve($conversation->appointment_id ? 'appointment' : 'on-demand',
                (int) ($conversation->appointment_id ?: $conversation->on_demand_request_id), $user);
        }
    }
}
