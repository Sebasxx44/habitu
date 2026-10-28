<?php

namespace App\Modules\Reviews\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Reviews\Models\Review;
use App\Modules\Reviews\Services\ReviewService;
use App\Core\DTOs\ServiceResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function __construct(private ReviewService $service) {}

    public function index(Request $request)
    {
        $query = Review::with('client:id,name')->where('is_active', true)
            ->when($request->business_id ?? $request->barber_shop_id, fn($q, $id) => $q->where('business_id', $id))
            ->when($request->rating, fn($q, $r) => $q->where('rating', '>=', $r))
            ->orderBy('created_at', 'desc');
        return ServiceResponse::success($query->paginate(50), 'Reseñas obtenidas')->toJsonResponse();
    }

    public function show($id)
    {
        $review = Review::with('client:id,name')->where('is_active', true)->find($id);
        if (!$review) return ServiceResponse::error('Reseña no encontrada', null, 404)->toJsonResponse();
        return ServiceResponse::success($review, 'Reseña obtenida')->toJsonResponse();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'appointment_id' => ['required', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Booking\Models\Appointment::class, 'id')],
            'rating' => 'required|integer|min:1|max:5',
            'service_rating' => 'nullable|integer|between:1,5',
            'professional_rating' => 'nullable|integer|between:1,5',
            'business_rating' => 'nullable|integer|between:1,5',
            'comment' => 'nullable|string|max:2000',
        ]);
        $review = $this->service->create($request->user(), $data);
        return ServiceResponse::success($review, 'Reseña creada', 201)->toJsonResponse();
    }

    public function update(Request $request, $id)
    {
        $review = Review::find($id);
        if (!$review) return ServiceResponse::error('Reseña no encontrada', null, 404)->toJsonResponse();
        abort_unless($review->client?->user_id === $request->user()->id, 403);
        $data = $request->validate(['rating' => 'sometimes|required|integer|min:1|max:5', 'comment' => 'nullable|string|max:2000',
            'service_rating' => 'nullable|integer|between:1,5', 'professional_rating' => 'nullable|integer|between:1,5', 'business_rating' => 'nullable|integer|between:1,5']);
        abort_unless($review->is_active, 404);
        if (! $review->professional_id && isset($data['professional_rating'])) {
            throw \Illuminate\Validation\ValidationException::withMessages(['professional_rating' => 'Esta reserva no tiene un profesional asignado.']);
        }
        $review->update($data);
        return ServiceResponse::success($review, 'Reseña actualizada')->toJsonResponse();
    }

    public function destroy(Request $request, $id)
    {
        $review = Review::find($id);
        if (!$review) return ServiceResponse::error('Reseña no encontrada', null, 404)->toJsonResponse();
        $user = $request->user();
        abort_unless($review->client?->user_id === $user->id || $user->role === 'SUPERADMIN'
            || ($user->role === 'ADMIN_BARBERIA' && app(\App\Services\BusinessAccessService::class)->canAccess($user, $review)), 403);
        // Keep the verified booking link so removing a review cannot create a second one.
        $review->update(['is_active' => false]);
        return ServiceResponse::success(null, 'Reseña eliminada')->toJsonResponse();
    }
}
