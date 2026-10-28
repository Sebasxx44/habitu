<?php

namespace App\Modules\Booking\Services;

use App\Core\DTOs\ServiceResponse;
use App\Modules\Booking\Models\SmartQueue;
use App\Modules\Booking\Models\SmartQueueDisplay;
use App\Modules\Booking\Models\SmartQueueEntry;
use App\Modules\Business\Models\BusinessBranch;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SmartQueueService
{
    public function createQueue(int $businessId, ?int $branchId, string $name = 'Fila Principal'): ServiceResponse
    {
        if ($branchId && ! BusinessBranch::whereKey($branchId)->where('business_id', $businessId)->where('is_active', true)->exists()) {
            return ServiceResponse::error('La sede no pertenece al negocio.', null, 422);
        }
        $queue = SmartQueue::create(['business_id' => $businessId, 'branch_id' => $branchId, 'name' => $name,
            'status' => 'ACTIVE', 'current_number' => 0, 'estimated_wait_minutes' => 0]);
        return ServiceResponse::success($queue, 'Fila creada', 201);
    }

    public function joinQueue(int $queueId, int $clientId): ServiceResponse
    {
        return DB::transaction(function () use ($queueId, $clientId) {
            $queue = SmartQueue::whereKey($queueId)->whereHas('business', fn ($business) => $business->where('is_active', true))->lockForUpdate()->first();
            if (! $queue || $queue->status !== 'ACTIVE') {
                return ServiceResponse::error('La fila no está activa.', null, 422);
            }
            $existing = SmartQueueEntry::where('queue_id', $queueId)->where('client_id', $clientId)
                ->whereIn('status', ['WAITING', 'CALLED', 'SERVING'])->first();
            if ($existing) {
                return ServiceResponse::success($existing->load('queue'), 'Ya tienes un turno en esta fila', 201);
            }
            $lastTicket = SmartQueueEntry::where('queue_id', $queueId)->max('ticket_number') ?? 0;
            $waitTime = $this->estimateWait($queueId);
            $entry = SmartQueueEntry::create(['queue_id' => $queueId, 'client_id' => $clientId, 'ticket_number' => $lastTicket + 1,
                'status' => 'WAITING', 'estimated_wait_minutes' => $waitTime]);
            $queue->update(['estimated_wait_minutes' => $waitTime ?? 0]);
            return ServiceResponse::success($entry->load('queue'), 'Turno reservado', 201);
        });
    }

    public function callNext(int $queueId): ServiceResponse
    {
        return DB::transaction(function () use ($queueId) {
            $queue = SmartQueue::whereKey($queueId)->lockForUpdate()->first();
            if (! $queue) {
                return ServiceResponse::notFound('Fila');
            }
            if ($queue->status !== 'ACTIVE') {
                return ServiceResponse::error('La fila no está activa.', null, 422);
            }
            $called = SmartQueueEntry::where('queue_id', $queueId)->where('status', 'CALLED')->orderBy('ticket_number')->first();
            if ($called) {
                return ServiceResponse::success($called->load('client:id,name'), 'Turno llamado');
            }
            $next = SmartQueueEntry::where('queue_id', $queueId)->where('status', 'WAITING')->orderBy('ticket_number')->lockForUpdate()->first();
            if (! $next) {
                return ServiceResponse::error('No hay turnos en espera.', null, 422);
            }
            $next->update(['status' => 'CALLED', 'called_at' => now()]);
            $queue->update(['current_number' => $next->ticket_number]);
            return ServiceResponse::success($next->load('client:id,name'), 'Turno llamado');
        });
    }

    public function startServing(int $entryId): ServiceResponse
    {
        return $this->transition($entryId, 'SERVING');
    }

    public function completeEntry(int $entryId): ServiceResponse
    {
        return $this->transition($entryId, 'COMPLETED');
    }

    public function cancelEntry(int $entryId): ServiceResponse
    {
        return $this->transition($entryId, 'CANCELLED');
    }

    private function transition(int $entryId, string $target): ServiceResponse
    {
        return DB::transaction(function () use ($entryId, $target) {
            $queueId = SmartQueueEntry::whereKey($entryId)->value('queue_id');
            $queue = SmartQueue::whereKey($queueId)->lockForUpdate()->first();
            $entry = SmartQueueEntry::whereKey($entryId)->lockForUpdate()->first();
            if (! $entry || ! $queue) {
                return ServiceResponse::notFound('Turno');
            }
            if ($entry->status === $target) {
                return ServiceResponse::success($entry, 'Turno actualizado');
            }
            $allowed = match ($entry->status) {
                'WAITING' => ['CANCELLED'], 'CALLED' => ['SERVING', 'CANCELLED'],
                'SERVING' => ['COMPLETED', 'CANCELLED'], default => [],
            };
            if (! in_array($target, $allowed, true)) {
                return ServiceResponse::error('Esta transición del turno no está permitida.', null, 422);
            }
            $entry->status = $target;
            if ($target === 'SERVING') $entry->served_at = now();
            if ($target === 'COMPLETED') $entry->completed_at = now();
            $entry->save();
            $queue->update(['estimated_wait_minutes' => $this->estimateWait($queue->id) ?? 0]);
            return ServiceResponse::success($entry, 'Turno actualizado');
        });
    }

    public function getQueueStatus(int $queueId): ServiceResponse
    {
        $queue = SmartQueue::whereHas('business', fn ($business) => $business->where('is_active', true))->find($queueId);
        if (! $queue) {
            return ServiceResponse::notFound('Fila');
        }
        $entries = $queue->entries()->whereIn('status', ['WAITING', 'CALLED', 'SERVING'])->orderBy('ticket_number')
            ->get(['id', 'ticket_number', 'status', 'estimated_wait_minutes']);
        return ServiceResponse::success([
            'id' => $queue->id, 'name' => $queue->name, 'business_id' => $queue->business_id, 'branch_id' => $queue->branch_id,
            'status' => $queue->status, 'current_number' => $queue->current_number,
            'estimated_wait_minutes' => $this->estimateWait($queueId), 'entries' => $entries,
        ], 'Estado de la fila');
    }

    public function createDisplay(int $queueId, string $name): ServiceResponse
    {
        $display = SmartQueueDisplay::create(['queue_id' => $queueId, 'display_name' => $name,
            'display_code' => strtoupper(Str::random(10)), 'settings' => ['sound' => true, 'theme' => 'dark']]);
        return ServiceResponse::success($display, 'Pantalla creada', 201);
    }

    public function getByBusiness(int $businessId): ServiceResponse
    {
        $queues = SmartQueue::where('business_id', $businessId)->whereHas('business', fn ($business) => $business->where('is_active', true))
            ->withCount(['entries' => fn ($query) => $query->whereIn('status', ['WAITING', 'CALLED', 'SERVING'])])->get();
        $averages = SmartQueueEntry::whereIn('queue_id', $queues->modelKeys())->where('status', 'COMPLETED')
            ->where('completed_at', '>=', now()->subDays(30))->whereColumn('completed_at', '>', 'served_at')
            ->selectRaw('queue_id, AVG(EXTRACT(EPOCH FROM (completed_at - served_at)) / 60) AS duration')->groupBy('queue_id')->pluck('duration', 'queue_id');
        foreach ($queues as $queue) {
            $queue->estimated_wait_minutes = isset($averages[$queue->id]) ? (int) ceil($queue->entries_count * $averages[$queue->id]) : null;
        }
        return ServiceResponse::success($queues, 'Filas disponibles');
    }

    private function estimateWait(int $queueId): ?int
    {
        $observed = SmartQueueEntry::where('queue_id', $queueId)->where('status', 'COMPLETED')
            ->whereNotNull('served_at')->whereNotNull('completed_at')->whereColumn('completed_at', '>', 'served_at')
            ->latest('completed_at')->limit(50)->get(['served_at', 'completed_at']);
        if ($observed->isEmpty()) {
            return null;
        }
        $average = $observed->avg(fn ($entry) => $entry->served_at->diffInSeconds($entry->completed_at) / 60);
        $waiting = SmartQueueEntry::where('queue_id', $queueId)->whereIn('status', ['WAITING', 'CALLED', 'SERVING'])->count();
        return (int) ceil($waiting * $average);
    }
}
