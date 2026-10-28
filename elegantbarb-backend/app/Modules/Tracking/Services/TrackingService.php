<?php

namespace App\Modules\Tracking\Services;

use App\Core\Contracts\ServiceInterface;
use App\Core\DTOs\ServiceResponse;
use App\Modules\Tracking\Models\LocationUpdate;
use Illuminate\Support\Facades\DB;

class TrackingService implements ServiceInterface
{
    public function __construct(
        private LocationUpdate $model
    ) {}

    public function all(array $filters = []): ServiceResponse
    {
        $query = $this->model->newQuery();

        if (! empty($filters['professional_id'])) {
            $query->where('professional_id', $filters['professional_id']);
        }

        if (! empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        $locations = $query->orderByDesc('recorded_at')->get();

        return ServiceResponse::success($locations, 'Locations retrieved');
    }

    public function find(int $id): ServiceResponse
    {
        $location = $this->model->find($id);

        if (! $location) {
            return ServiceResponse::notFound('Location update');
        }

        return ServiceResponse::success($location, 'Location found');
    }

    public function create(array $data): ServiceResponse
    {
        $location = DB::transaction(function () use ($data) {
            return $this->model->create($data);
        });

        return ServiceResponse::success($location, 'Location created', 201);
    }

    public function update(int $id, array $data): ServiceResponse
    {
        $location = $this->model->find($id);

        if (! $location) {
            return ServiceResponse::notFound('Location update');
        }

        DB::transaction(function () use ($location, $data) {
            $location->update($data);
        });

        return ServiceResponse::success($location, 'Location updated');
    }

    public function delete(int $id): ServiceResponse
    {
        $location = $this->model->find($id);

        if (! $location) {
            return ServiceResponse::notFound('Location update');
        }

        DB::transaction(function () use ($location) {
            $location->delete();
        });

        return ServiceResponse::success(null, 'Location deleted');
    }

    public function updateLocation(int $userId, ?int $professionalId, array $data): ServiceResponse
    {
        $payload = array_merge($data, [
            'user_id' => $userId,
            'professional_id' => $professionalId,
            'trackable_type' => \App\Modules\People\Models\Professional::class,
            'trackable_id' => $professionalId,
            'recorded_at' => $data['recorded_at'] ?? now(),
        ]);

        $location = DB::transaction(function () use ($payload) {
            return $this->model->create($payload);
        });

        $location->load('professional');
        event(new \App\Modules\Tracking\Events\LocationUpdated($location));

        return ServiceResponse::success($location, 'Location updated successfully', 201);
    }

    public function getLatestLocation(int $professionalId): ServiceResponse
    {
        $location = $this->model
            ->where('professional_id', $professionalId)
            ->orderByDesc('recorded_at')
            ->first();

        if (! $location) {
            return ServiceResponse::notFound('Location');
        }

        $location->setAttribute('is_stale', $location->recorded_at->lt(now()->subMinutes(5)));
        $location->setAttribute('fresh_until', $location->recorded_at->copy()->addMinutes(5)->toIso8601String());
        return ServiceResponse::success($location, 'Latest location retrieved');
    }

    public function getLocationHistory(int $professionalId, string $since): ServiceResponse
    {
        $locations = $this->model
            ->where('professional_id', $professionalId)
            ->where('recorded_at', '>=', $since)
            ->orderBy('recorded_at')
            ->get();

        return ServiceResponse::success($locations, 'Location history retrieved');
    }
}
