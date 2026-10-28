<?php

namespace App\Modules\Reviews\Services;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Reviews\Models\Review;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReviewService
{
    public function create(User $user, array $data): Review
    {
        return DB::transaction(fn () => $this->createVerifiedReview($user, $data));
    }

    private function createVerifiedReview(User $user, array $data): Review
    {
        $appointment = Appointment::lockForUpdate()->findOrFail($data['appointment_id']);
        abort_unless($appointment->client?->user_id === $user->id, 403);
        if ($appointment->getRawOriginal('status') !== 'COMPLETED') {
            throw ValidationException::withMessages(['appointment_id' => 'Solo puedes valorar citas completadas.']);
        }
        if (Review::where('appointment_id', $appointment->id)->exists()) {
            throw ValidationException::withMessages(['appointment_id' => 'Esta cita ya tiene una reseña.']);
        }
        if (! $appointment->professional_id && isset($data['professional_rating'])) {
            throw ValidationException::withMessages(['professional_rating' => 'Esta reserva no tiene un profesional asignado.']);
        }
        return Review::create([
            'appointment_id' => $appointment->id,
            'client_id' => $appointment->client_id,
            'business_id' => $appointment->business_id,
            'branch_id' => $appointment->branch_id,
            'professional_id' => $appointment->professional_id,
            'rating' => $data['rating'],
            'service_rating' => $data['service_rating'] ?? null,
            'professional_rating' => $data['professional_rating'] ?? null,
            'business_rating' => $data['business_rating'] ?? null,
            'comment' => $data['comment'] ?? null,
            'is_verified' => true,
            'is_active' => true,
        ]);
    }
}
