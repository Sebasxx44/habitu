<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Services\BusinessAccessService;
use App\Services\RouteResourceService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBusinessAccess
{
    private const CATALOG = ['businesses', 'branches', 'professionals', 'services', 'resources', 'reviews', 'loyalty', 'promotions'];
    private const ADMIN_MODULES = ['businesses', 'branches', 'professionals', 'clients', 'services', 'resources', 'loyalty', 'campaigns', 'ads', 'promotions', 'dynamic-pricing', 'automation'];
    private const BUSINESS_LISTS = ['clients', 'appointments', 'campaigns', 'payments', 'earnings', 'on-demand'];

    public function __construct(private BusinessAccessService $access, private RouteResourceService $resources) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        if ($user->role === User::ROLE_SUPERADMIN) return $next($request);

        $module = (string) $request->segment(3);
        $action = $request->route()->getActionMethod();
        $read = $request->isMethod('GET');
        $admin = $user->role === User::ROLE_ADMIN;
        $client = $user->role === User::ROLE_CLIENT;
        $businessIds = $this->access->businessIds($user);
        $promotionValidation = $module === 'promotions' && $action === 'validateCode';
        if ($user->role === User::ROLE_PROFESSIONAL) {
            $user->barber_id = Professional::where('user_id', $user->id)->value('id');
        }

        if (! $read && ! $promotionValidation && in_array($module, self::ADMIN_MODULES, true)) {
            abort_unless($admin, 403, 'Esta acción requiere administración del negocio.');
        }
        if ($module === 'dashboard' || $module === 'payments') abort_unless($admin, 403);
        if ($module === 'clients') abort_unless($admin || ($client && $read && $action !== 'stats'), 403);
        if ($module === 'promotions' && in_array($action, ['managed', 'stats'], true)) abort_unless($admin, 403);
        if ($module === 'campaigns') abort_unless($admin, 403);
        if ($module === 'bnpl' && in_array($action, ['approve', 'reject', 'payInstallment'], true)) abort_unless($admin, 403);
        if ($module === 'split-payments' && $action === 'markPaid') abort_unless($admin, 403);
        if ($module === 'memberships' && in_array($action, ['storePlan', 'updatePlan'], true)) abort_unless($admin, 403);
        if ($module === 'smart-queues' && ! in_array($action, ['join', 'cancel'], true)) {
            $professionalOperation = $user->role === User::ROLE_PROFESSIONAL && in_array($action, ['callNext', 'startServing', 'complete'], true);
            abort_unless($admin || $professionalOperation, 403);
        }
        if ($module === 'appointments' && in_array($action, ['store', 'quote'], true)) abort_unless($admin || $client, 403);
        if ($module === 'appointments' && $action === 'stats') abort_unless($admin, 403);
        if ($module === 'waitlist' && $action === 'businessIndex') abort_unless($admin, 403);
        if ($module === 'webhooks') abort_unless($admin, 403);
        if ($module === 'on-demand') {
            if ($action === 'store') abort_unless($admin || $client, 403);
            if ($action === 'accept') abort_unless($user->role === User::ROLE_PROFESSIONAL, 403);
            if ($action === 'updateStatus') abort_unless($admin || $user->role === User::ROLE_PROFESSIONAL, 403);
        }

        $permission = $this->permissionFor($module, $action, $read);
        if ($permission && ! ($client && $read && $module === 'clients') && ! ($read && $action !== 'stats' && in_array($module, self::CATALOG, true))) {
            abort_unless($user->hasEffectivePermission($permission), 403, 'No tienes permiso para esta acción.');
        }

        // Input filters never confer ownership. Resolve the actual routed record first.
        $record = $this->resources->resolve($request, $module);
        if ($record && ! ($client && $module === 'smart-queues' && $action === 'join') && ! ($read && $action !== 'stats' && in_array($module, self::CATALOG, true))) {
            if ($record instanceof OnDemandRequest && $user->role === User::ROLE_PROFESSIONAL) {
                $assigned = $user->barber_id && (int) $record->professional_id === (int) $user->barber_id;
                $offered = $record->status === 'SEARCHING' && $record->search_expires_at?->isFuture()
                    && $record->assignments()->where('professional_id', $user->barber_id)->where('status', 'PENDING')->exists();
                abort_unless($assigned || ($offered && in_array($action, ['show', 'accept', 'reject'], true)), 403);
            } else {
                $ownedRecord = $client ? $record : $this->resources->businessRecord($record);
                abort_unless($this->access->canAccess($user, $ownedRecord), 403);
            }
        }

        $businessId = $request->input('business_id') ?? $request->input('barber_shop_id');
        if ($admin && ! $read && ! $businessId && ! $record && ! $promotionValidation && $module !== 'businesses' && in_array($module, self::ADMIN_MODULES, true)) {
            abort_unless(count($businessIds) > 0, 403);
            $businessId = $businessIds[0];
            $request->merge(['business_id' => $businessId, 'barber_shop_id' => $businessId]);
        }
        if (! $client && $businessId) abort_unless(in_array((int) $businessId, $businessIds, true), 403);
        if (! $client && ! $businessId && in_array($module, self::BUSINESS_LISTS, true) && ! $record) {
            abort_unless(count($businessIds) > 0, 403, 'No tienes un negocio asignado.');
            $request->merge(['business_id' => $businessIds[0], 'barber_shop_id' => $businessIds[0]]);
        }
        if (! $client && ! $read && ! $promotionValidation && in_array($module, self::ADMIN_MODULES, true) && ! $record && $module !== 'businesses') {
            abort_unless($businessId && in_array((int) $businessId, $businessIds, true), 403, 'Selecciona un negocio autorizado.');
        }

        if ($client && $module === 'appointments') {
            if ($request->filled('client_id')) abort_unless(Client::whereKey($request->input('client_id'))->where('user_id', $user->id)->exists(), 403);
        }
        if ($client && in_array($module, [ 'bnpl', 'memberships', 'on-demand', 'reviews', 'smart-queues'], true)) {
            $clientId = $this->access->clientId($user);
            abort_unless($clientId, 403, 'Completa tu perfil de cliente.');
            abort_if($request->filled('client_id') && (int) $request->input('client_id') !== $clientId, 403);
            $request->merge(['client_id' => $clientId]);
            $user->cliente_id = $clientId;
        }
        if ($request->filled('client_id') && ! $client) {
            abort_unless($this->access->canAccess($user, Client::findOrFail($request->input('client_id'))), 403);
        }
        if ($request->filled('appointment_id') && ! in_array($module, ['appointments'], true)) {
            abort_unless($this->access->canAccess($user, Appointment::findOrFail($request->input('appointment_id'))), 403);
        }
        if (! $read && ! $client) {
            $contextBusinessId = $record ? $this->resources->businessRecord($record)->getAttribute('business_id') : $businessId;
            if ($contextBusinessId) $this->authorizeReferences($request, (int) $contextBusinessId);
        }
        if ($module === 'google-calendar') {
            abort_unless(in_array($user->role, [User::ROLE_ADMIN, User::ROLE_PROFESSIONAL], true), 403);
            $professionalId = $user->role === User::ROLE_PROFESSIONAL ? $user->barber_id : $request->input('professional_id');
            abort_unless($professionalId, 403);
            abort_if($user->role === User::ROLE_PROFESSIONAL && $request->filled('professional_id') && (int) $request->input('professional_id') !== (int) $professionalId, 403);
            abort_unless($this->access->canAccess($user, Professional::findOrFail($professionalId)), 403);
            $request->merge(['professional_id' => $professionalId]);
        }
        if ($module === 'tracking') $this->authorizeTracking($request, $user);
        return $next($request);
    }

    private function authorizeReferences(Request $request, int $businessId): void
    {
        $models = [
            'branch_id' => \App\Modules\Business\Models\BusinessBranch::class,
            'professional_id' => Professional::class,
            'service_id' => \App\Modules\Catalog\Models\Service::class,
            'resource_id' => \App\Modules\Booking\Models\Resource::class,
        ];
        foreach ($models as $field => $class) {
            if ($request->filled($field)) {
                abort_unless((int) $class::findOrFail($request->input($field))->business_id === $businessId, 403);
            }
        }
    }

    private function permissionFor(string $module, string $action, bool $read): ?string
    {
        $group = match ($module) {
            'businesses' => 'barbershops', 'professionals' => 'barbers',
            'clients', 'appointments', 'services' => $module,
            default => null,
        };
        if (! $group) return null;
        $operation = $read ? 'view' : match ($action) {
            'store', 'quote' => 'create', 'destroy' => 'delete', 'cancel' => 'cancel', default => 'edit',
        };
        if ($group === 'services' && ! $read) $operation = 'manage';
        if ($group === 'appointments' && $operation === 'delete') $operation = 'cancel';
        return "$group.$operation";
    }

    private function authorizeTracking(Request $request, User $user): void
    {
        $id = $request->route('professionalId');
        if (! $id) {
            abort_unless($user->role === User::ROLE_PROFESSIONAL, 403);
            return;
        }
        $professional = Professional::findOrFail($id);
        if ($user->role !== User::ROLE_CLIENT) {
            abort_unless($this->access->canAccess($user, $professional), 403);
            return;
        }
        $clientId = $this->access->clientId($user);
        abort_unless($clientId && (
            Appointment::where('client_id', $clientId)->where('professional_id', $id)
                ->whereDate('date', today())->whereIn('status', ['PENDING', 'CONFIRMED'])->exists()
            || OnDemandRequest::where('client_id', $clientId)->where('professional_id', $id)
                ->whereIn('status', ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'])->exists()
        ), 403);
        abort_if($request->route()->getActionMethod() === 'history', 403);
    }
}
