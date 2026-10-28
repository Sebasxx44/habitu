<?php

namespace App\Modules\Booking\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Models\OperationalBlock;
use App\Modules\Booking\Models\Resource;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\People\Services\OperationsAccess;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class OperationalBlockController extends Controller
{
    public function __construct(private OperationsAccess $access) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => 'required|integer', 'branch_id' => 'nullable|integer',
            'professional_id' => 'nullable|integer', 'resource_id' => 'nullable|integer',
            'kind' => 'required|in:ABSENCE,MAINTENANCE,CLOSURE', 'reason' => 'required|string|max:500',
            'starts_at' => 'required|date_format:Y-m-d\TH:i', 'ends_at' => 'required|date_format:Y-m-d\TH:i|after:starts_at',
        ]);
        $this->access->business($request->user(), $data['business_id'], true);
        $targets = array_filter(array_intersect_key($data, array_flip(['professional_id', 'resource_id', 'branch_id'])));
        abort_unless(count($targets) === 1, 422, 'Selecciona un solo profesional, recurso o sede.');
        if (! empty($data['professional_id'])) {
            $professional = $this->access->professional($request->user(), $data['professional_id'], true);
            abort_unless((int) $professional->business_id === (int) $data['business_id'] && $data['kind'] === 'ABSENCE', 422);
        } else {
            abort_if($request->user()->role === User::ROLE_PROFESSIONAL, 403);
            if (! empty($data['resource_id'])) {
                Resource::where('business_id', $data['business_id'])->findOrFail($data['resource_id']);
                abort_unless($data['kind'] === 'MAINTENANCE', 422);
            } else {
                BusinessBranch::where('business_id', $data['business_id'])->findOrFail($data['branch_id']);
                abort_unless($data['kind'] === 'CLOSURE', 422);
            }
        }
        $start = CarbonImmutable::parse($data['starts_at'], config('booking.timezone'));
        $end = CarbonImmutable::parse($data['ends_at'], config('booking.timezone'));
        abort_if($start->isPast() || $start->diffInDays($end) > 90, 422, 'Selecciona un periodo futuro de hasta 90 días.');
        $data['starts_at'] = $start->utc(); $data['ends_at'] = $end->utc(); $data['created_by'] = $request->user()->id;
        $block = DB::transaction(fn () => $this->createBlock($data, $targets, $start, $end));
        return response()->json(['data' => $block], 201);
    }

    private function createBlock(array $data, array $targets, CarbonImmutable $start, CarbonImmutable $end): OperationalBlock
    {
        BusinessBranch::where('business_id', $data['business_id'])->orderBy('id')->lockForUpdate()->get();
        $conflicts = Appointment::where('business_id', $data['business_id'])->where($targets)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])->get()
            ->filter(fn (Appointment $appointment) => CarbonImmutable::parse($appointment->date->toDateString().' '.$appointment->getRawOriginal('start_time'), config('booking.timezone'))->lt($end)
                && CarbonImmutable::parse($appointment->date->toDateString().' '.$appointment->getRawOriginal('end_time'), config('booking.timezone'))->gt($start))->pluck('id')->all();
        if ($conflicts) throw ValidationException::withMessages(['appointments' => 'Revisa primero las reservas afectadas: '.implode(', ', $conflicts).'.']);
        return OperationalBlock::create($data);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $block = OperationalBlock::findOrFail($id);
        $this->access->business($request->user(), $block->business_id, true);
        if ($request->user()->role === User::ROLE_PROFESSIONAL) {
            abort_unless($block->professional_id, 403);
            $this->access->professional($request->user(), $block->professional_id, true);
        }
        $block->delete();
        return response()->json(['message' => 'Bloqueo retirado.']);
    }
}
