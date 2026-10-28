<?php

namespace App\Modules\Booking\Services;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Services\FeatureFlagService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class GroupCoordinationService
{
    public function list(User $user): array
    {
        return DB::table('booking.groups')->whereIn('id', DB::table('booking.group_members')->where('user_id', $user->id)->select('group_id'))
            ->orderByDesc('id')->limit(50)->get()->map(fn ($group) => $this->present($group, $user))->all();
    }

    public function create(User $user, array $data): array
    {
        return DB::transaction(function () use ($user, $data) {
            $appointment = isset($data['appointment_id']) ? $this->ownedAppointment($user, $data['appointment_id']) : null;
            abort_unless(app(FeatureFlagService::class)->isEnabled('group_coordination', $user->id, $appointment?->business_id, $appointment?->business?->business_category_id), 403, 'La coordinación de grupos está desactivada.');
            if ($appointment) {
                $existing = DB::table('booking.groups')->where('appointment_id', $appointment->id)->first();
                if ($existing) return $this->present($existing, $user);
            }
            $token = Str::random(48);
            $id = DB::table('booking.groups')->insertGetId([
                'organizer_id' => $user->id, 'appointment_id' => $appointment?->id, 'title' => $data['title'],
                'invite_hash' => hash('sha256', $token), 'expires_at' => $data['expires_at'],
                'member_limit' => $data['member_limit'] ?? 20, 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('booking.group_members')->insert(['group_id' => $id, 'user_id' => $user->id, 'response' => 'CONFIRMED', 'created_at' => now(), 'updated_at' => now()]);
            foreach ($data['options'] ?? [] as $label) DB::table('booking.group_options')->insert(['group_id' => $id, 'label' => $label, 'created_at' => now(), 'updated_at' => now()]);
            return [...$this->show($user, $id), 'invite_token' => $token];
        });
    }

    public function show(User $user, int $id): array
    {
        return $this->present($this->authorized($user, $id), $user);
    }

    public function join(User $user, string $token): array
    {
        return DB::transaction(function () use ($user, $token) {
            $group = DB::table('booking.groups')->where('invite_hash', hash('sha256', $token))->lockForUpdate()->first();
            abort_unless($group, 404);
            $this->open($group);
            $member = DB::table('booking.group_members')->where('group_id', $group->id)->where('user_id', $user->id)->first();
            if (! $member || $member->response !== 'CONFIRMED') {
                abort_if(DB::table('booking.group_members')->where('group_id', $group->id)->where('response', 'CONFIRMED')->count() >= $group->member_limit, 409, 'El grupo alcanzó su límite de participantes.');
                DB::table('booking.group_members')->updateOrInsert(['group_id' => $group->id, 'user_id' => $user->id], ['response' => 'CONFIRMED', 'created_at' => $member?->created_at ?? now(), 'updated_at' => now()]);
            }
            return $this->present($group, $user);
        });
    }

    public function update(User $user, int $id, array $data): array
    {
        return DB::transaction(function () use ($user, $id, $data) {
            $group = $this->authorized($user, $id, true);
            abort_unless($group->organizer_id === $user->id, 403);
            $this->open($group);
            $update = ['updated_at' => now()];
            if (isset($data['appointment_id'])) {
                abort_if($group->appointment_id, 409, 'El grupo ya tiene una reserva.');
                $appointment = $this->ownedAppointment($user, $data['appointment_id']);
                abort_unless(app(FeatureFlagService::class)->isEnabled('group_coordination', $user->id, $appointment->business_id, $appointment->business?->business_category_id), 403, 'La coordinación de grupos está desactivada en este negocio.');
                abort_if(DB::table('booking.groups')->where('appointment_id', $appointment->id)->where('id', '!=', $id)->exists(), 409, 'La reserva ya pertenece a otro grupo.');
                $update['appointment_id'] = $appointment->id;
            }
            if (isset($data['status'])) $update['status'] = $data['status'];
            DB::table('booking.groups')->where('id', $id)->update($update);
            return $this->show($user, $id);
        });
    }

    public function invitation(User $user, int $id): array
    {
        return DB::transaction(function () use ($user, $id) {
            $group = $this->authorized($user, $id, true);
            abort_unless($group->organizer_id === $user->id, 403);
            $this->open($group);
            $token = Str::random(48);
            DB::table('booking.groups')->where('id', $id)->update(['invite_hash' => hash('sha256', $token), 'updated_at' => now()]);
            return ['invite_token' => $token];
        });
    }

    public function respond(User $user, int $id, string $response, ?int $optionId): array
    {
        return DB::transaction(function () use ($user, $id, $response, $optionId) {
            $group = $this->authorized($user, $id, true);
            $this->open($group);
            abort_if($response === 'DECLINED' && $group->organizer_id === $user->id, 422, 'El organizador puede cerrar el grupo.');
            $member = DB::table('booking.group_members')->where('group_id', $id)->where('user_id', $user->id)->first();
            if ($response === 'CONFIRMED' && $member->response !== 'CONFIRMED') abort_if(DB::table('booking.group_members')->where('group_id', $id)->where('response', 'CONFIRMED')->count() >= $group->member_limit, 409);
            DB::table('booking.group_members')->where('id', $member->id)->update(['response' => $response, 'updated_at' => now()]);
            if ($optionId) {
                abort_unless(DB::table('booking.group_options')->where('id', $optionId)->where('group_id', $id)->exists(), 422);
                DB::table('booking.group_votes')->updateOrInsert(['group_id' => $id, 'user_id' => $user->id], ['option_id' => $optionId, 'created_at' => now(), 'updated_at' => now()]);
            }
            if ($response === 'DECLINED') DB::table('booking.group_votes')->where('group_id', $id)->where('user_id', $user->id)->delete();
            return $this->show($user, $id);
        });
    }

    private function ownedAppointment(User $user, int $id): Appointment
    {
        $appointment = Appointment::with(['client', 'business'])->whereKey($id)->lockForUpdate()->firstOrFail();
        abort_unless($appointment->client->user_id === $user->id, 403);
        abort_unless(in_array($appointment->booking_model, ['resource', 'capacity'], true), 422, 'Selecciona una reserva de espacio o actividad con cupos.');
        abort_unless(in_array($appointment->status->value, ['PENDING', 'CONFIRMED', 'RESCHEDULED'], true), 409, 'La reserva ya no admite coordinación.');
        return $appointment;
    }

    private function authorized(User $user, int $id, bool $lock = false): object
    {
        $query = DB::table('booking.groups')->where('id', $id);
        if ($lock) $query->lockForUpdate();
        $group = $query->first();
        abort_unless($group && DB::table('booking.group_members')->where('group_id', $id)->where('user_id', $user->id)->exists(), 404);
        return $group;
    }

    private function open(object $group): void
    {
        abort_unless($group->status === 'OPEN' && CarbonImmutable::parse($group->expires_at)->isFuture(), 410, 'La invitación ha vencido o el grupo está cerrado.');
        if ($group->appointment_id) {
            $appointment = Appointment::find($group->appointment_id);
            abort_unless($appointment && in_array($appointment->status->value, ['PENDING', 'CONFIRMED', 'RESCHEDULED'], true), 409, 'La reserva ya no admite cambios de participantes.');
        }
    }

    private function present(object $group, User $user): array
    {
        $appointment = $group->appointment_id ? Appointment::with(['service', 'branch', 'resource'])->find($group->appointment_id) : null;
        $organizer = $group->organizer_id === $user->id;
        $members = DB::table('booking.group_members as member')->join('public.users as user', 'user.id', '=', 'member.user_id')->where('member.group_id', $group->id)->orderBy('member.id');
        return [
            'id' => $group->id, 'title' => $group->title, 'is_organizer' => $organizer,
            'status' => $group->status === 'OPEN' && CarbonImmutable::parse($group->expires_at)->isPast() ? 'EXPIRED' : $group->status,
            'expires_at' => CarbonImmutable::parse($group->expires_at)->toIso8601String(), 'member_limit' => $group->member_limit,
            'confirmed_count' => (clone $members)->where('member.response', 'CONFIRMED')->count(),
            'my_response' => (clone $members)->where('member.user_id', $user->id)->value('member.response'),
            'members' => $organizer ? $members->get(['user.name', 'member.response'])->all() : [],
            'payment_mode' => 'ORGANIZER_PAYS', 'contributions_enabled' => false,
            'appointment' => $appointment ? ['id' => $organizer ? $appointment->id : null, 'service' => $appointment->service?->name,
                'branch' => $appointment->branch?->name, 'resource' => $appointment->resource?->name, 'date' => $appointment->date->toDateString(),
                'start_time' => $appointment->start_time->format('H:i'), 'status' => $appointment->status->value,
                'currency' => $appointment->currency, 'total' => $appointment->final_price, 'payment_status' => $appointment->payment_status] : null,
            'options' => DB::table('booking.group_options')->where('group_id', $group->id)->orderBy('id')->get()->map(fn ($option) => [
                'id' => $option->id, 'label' => $option->label,
                'votes' => DB::table('booking.group_votes')->where('option_id', $option->id)->count(),
                'selected' => DB::table('booking.group_votes')->where('option_id', $option->id)->where('user_id', $user->id)->exists(),
            ])->all(),
        ];
    }
}
