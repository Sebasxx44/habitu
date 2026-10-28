<?php

namespace App\Modules\Business\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Business\Models\BusinessBranch;
use App\Core\DTOs\ServiceResponse;
use Illuminate\Http\Request;
use App\Models\User;
use App\Modules\Business\Services\BranchAnalyticsService;
use App\Services\BusinessAccessService;
use App\Modules\Analytics\Services\AnalyticsPeriod;

class BranchController extends Controller
{
    public function index(Request $request)
    {
        $request->validate(['business_id' => 'nullable|integer', 'search' => 'nullable|string|max:100',
            'active' => 'nullable|boolean', 'analytics' => 'nullable|boolean', 'days' => 'nullable|integer|between:1,366',
            'currency' => 'nullable|string|regex:/^[A-Z]{3}$/', 'page' => 'nullable|integer|min:1']);
        $query = BusinessBranch::with('business', 'schedules')
            ->when($request->business_id, fn($q, $id) => $q->where('business_id', $id))
            ->when($request->has('active'), fn($q) => $q->where('is_active', $request->boolean('active')))
            ->when($request->filled('search'), fn($q) => $q->where(fn($search) => $search
                ->where('name', 'ilike', '%'.$request->string('search').'%')->orWhere('address', 'ilike', '%'.$request->string('search').'%')));

        $analytics = null;
        if ($request->boolean('analytics')) {
            $user = $request->user();
            abort_unless(in_array($user->role, [User::ROLE_ADMIN, User::ROLE_SUPERADMIN], true), 403);
            if ($user->role !== User::ROLE_SUPERADMIN) $query->whereIn('business_id', app(BusinessAccessService::class)->businessIds($user));
            $analytics = app(BranchAnalyticsService::class)->overview(clone $query, AnalyticsPeriod::fromRequest($request));
            $query->withCount('services');
        }
        $page = $query->orderByDesc('is_main_branch')->orderBy('name')->orderBy('id')->paginate($analytics ? 12 : 50);
        $page->getCollection()->each(function ($branch) use ($analytics) {
            $branch->setRelation('schedules', $branch->schedules->map(fn ($schedule) => [
                'id' => $schedule->id, 'branch_id' => $schedule->branch_id, 'day' => (string) $schedule->day, 'open_time' => $schedule->open_time?->format('H:i'),
                'close_time' => $schedule->close_time?->format('H:i'), 'is_closed' => $schedule->is_closed,
            ]));
            if ($analytics) $branch->setAttribute('metrics', $analytics['metrics'][$branch->id]);
        });
        return ServiceResponse::success(array_merge($page->toArray(), $analytics ? ['summary' => $analytics['summary'], 'analytics' => $analytics['branches']] : []), 'Sucursales obtenidas')->toJsonResponse();
    }

    public function show($id)
    {
        $branch = BusinessBranch::with('business', 'schedules', 'professionals')->find($id);
        if (!$branch) return ServiceResponse::error('Sucursal no encontrada', null, 404)->toJsonResponse();
        return ServiceResponse::success($branch, 'Sucursal obtenida')->toJsonResponse();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'business_id' => 'required|exists:pgsql.business.businesses,id',
            'name' => 'required|string|max:255',
            'address' => 'required|string|max:500',
            'city_id' => 'nullable|integer',
            'lat' => 'nullable|numeric|between:-90,90|required_with:lng',
            'lng' => 'nullable|numeric|between:-180,180|required_with:lat',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'is_main_branch' => 'boolean',
            'is_active' => 'boolean',
            ...$this->scheduleRules(),
        ]);
        $branch = \DB::transaction(function () use ($data) {
            \App\Modules\Business\Models\Business::whereKey($data['business_id'])->lockForUpdate()->firstOrFail();
            if ($data['is_main_branch'] ?? false) BusinessBranch::where('business_id', $data['business_id'])->update(['is_main_branch' => false]);
            $branch = BusinessBranch::create(collect($data)->except('schedules')->all());
            $this->saveSchedules($branch, $data);
            return $branch;
        });
        return ServiceResponse::success($branch, 'Sucursal creada', 201)->toJsonResponse();
    }

    public function update(Request $request, $id)
    {
        $branch = BusinessBranch::find($id);
        if (!$branch) return ServiceResponse::error('Sucursal no encontrada', null, 404)->toJsonResponse();
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255', 'address' => 'sometimes|required|string|max:500',
            'city_id' => 'nullable|integer', 'lat' => 'nullable|numeric|between:-90,90|required_with:lng', 'lng' => 'nullable|numeric|between:-180,180|required_with:lat',
            'phone' => 'nullable|string|max:50', 'email' => 'nullable|email|max:255', 'is_main_branch' => 'sometimes|boolean', 'is_active' => 'sometimes|boolean',
            ...$this->scheduleRules(),
        ]);
        \DB::transaction(function () use ($branch, $data) {
            \App\Modules\Business\Models\Business::whereKey($branch->business_id)->lockForUpdate()->firstOrFail();
            if ($data['is_main_branch'] ?? false) BusinessBranch::where('business_id', $branch->business_id)->whereKeyNot($branch->id)->update(['is_main_branch' => false]);
            $branch->update(collect($data)->except('schedules')->all());
            $this->saveSchedules($branch, $data);
        });
        return ServiceResponse::success($branch, 'Sucursal actualizada')->toJsonResponse();
    }

    public function destroy($id)
    {
        $branch = BusinessBranch::find($id);
        if (!$branch) return ServiceResponse::error('Sucursal no encontrada', null, 404)->toJsonResponse();
        if ($branch->is_main_branch) return ServiceResponse::error('Asigna otra sede principal antes de eliminar esta sucursal.', null, 422)->toJsonResponse();
        if ($branch->appointments()->withTrashed()->exists()) {
            return ServiceResponse::error('Esta sede tiene historial de citas. Desactívala para conservarlo.', null, 422)->toJsonResponse();
        }
        $branch->delete();
        return ServiceResponse::success(null, 'Sucursal eliminada')->toJsonResponse();
    }

    private function scheduleRules(): array
    {
        return ['schedules' => 'sometimes|required|array|size:7',
            'schedules.*' => 'required|array:day,open_time,close_time,is_closed',
            'schedules.*.day' => 'required|integer|between:0,6|distinct',
            'schedules.*.open_time' => 'required|date_format:H:i',
            'schedules.*.close_time' => 'required|date_format:H:i|after:schedules.*.open_time',
            'schedules.*.is_closed' => 'required|boolean'];
    }

    private function saveSchedules(BusinessBranch $branch, array $data): void
    {
        if (!array_key_exists('schedules', $data)) return;
        $branch->schedules()->delete();
        $branch->schedules()->createMany($data['schedules']);
    }
}
