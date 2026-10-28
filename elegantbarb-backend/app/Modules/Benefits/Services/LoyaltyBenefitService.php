<?php

declare(strict_types=1);

namespace App\Modules\Benefits\Services;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Loyalty\Models\LoyaltyCard;
use App\Modules\Loyalty\Models\LoyaltyProgram;
use App\Modules\People\Models\Client;
use App\Modules\Realtime\Services\ResourceChangePublisher;
use App\Services\BusinessAccessService;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;

final class LoyaltyBenefitService
{
    public function enroll(User $user, int $programId): LoyaltyCard
    {
        return DB::transaction(function () use ($user, $programId) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $program = LoyaltyProgram::where('active', true)->where('type', 'STAMP')
                ->whereHas('business', fn ($query) => $query->where('is_active', true))->lockForUpdate()->findOrFail($programId);
            abort_if($program->valid_until && $program->valid_until->toDateString() < now(config('booking.timezone'))->toDateString(), 422, 'Este programa ya venció.');
            $existing = LoyaltyCard::where('loyalty_program_id', $programId)->whereIn('client_id', Client::where('user_id', $user->id)->select('id'))->first();
            if ($existing) return $existing;
            $client = Client::firstOrCreate(['user_id' => $user->id, 'business_id' => $program->business_id], ['name' => $user->name, 'email' => $user->email]);
            return LoyaltyCard::create(['loyalty_program_id' => $programId, 'client_id' => $client->id, 'business_id' => $program->business_id, 'status' => 'ACTIVE']);
        }, 3);
    }

    /** Called in the appointment transaction. One stamp per enrolled card and completed appointment. */
    public function awardCompleted(Appointment $appointment): void
    {
        if ($appointment->getRawOriginal('status') !== 'COMPLETED') return;
        $userId = $appointment->client?->user_id;
        if (! $userId) return;
        $cards = LoyaltyCard::with('program')->where('business_id', $appointment->business_id)->where('status', 'ACTIVE')
            ->whereIn('client_id', Client::where('user_id', $userId)->select('id'))->orderBy('id')->lockForUpdate()->get();
        foreach ($cards as $card) {
            $program = $card->program;
            if (! $program || ! $program->active || $program->type !== 'STAMP'
                || ($program->valid_until && $program->valid_until->toDateString() < now(config('booking.timezone'))->toDateString())
                || ($program->service_id && (int) $program->service_id !== (int) $appointment->service_id)
                || ($program->professional_id && (int) $program->professional_id !== (int) $appointment->professional_id)) continue;
            if (DB::table('loyalty.loyalty_transactions')->where('loyalty_card_id', $card->id)->where('appointment_id', $appointment->id)->exists()) continue;
            $stamps = $card->current_stamps + 1;
            $card->update(['current_stamps' => $stamps, 'total_stamps_ever' => $card->total_stamps_ever + 1,
                'reward_available' => $stamps >= $program->stamps_required, 'last_stamp_at' => now()]);
            DB::table('loyalty.loyalty_transactions')->insert(['client_id' => $card->client_id, 'loyalty_card_id' => $card->id,
                'appointment_id' => $appointment->id, 'points' => 1, 'type' => 'EARN', 'description' => 'Visita completada · '.$program->name, 'created_at' => now()]);
            $this->notifyStamp($card);
        }
    }

    public function notifyStamp(LoyaltyCard $card): void
    {
        $userId = $card->client?->user_id;
        if (! $userId) return;
        $ready = $card->reward_available && $card->current_stamps >= $card->program->stamps_required;
        app(NotificationService::class)->sendToUser((int) $userId, $ready ? 'LOYALTY_REWARD_READY' : 'LOYALTY_STAMP_EARNED',
            $ready ? 'Tienes un premio disponible' : 'Sumaste un sello',
            $ready ? $card->program->reward_description : $card->program->name.': '.$card->current_stamps.' de '.$card->program->stamps_required.' sellos.',
            ['card_id' => $card->id, 'business_id' => $card->business_id, 'url' => '/cliente/benefits']);
    }

    public function consumeVoucher(User $user, string $code): object
    {
        abort_unless(in_array($user->role, ['SUPERADMIN', 'ADMIN_BARBERIA'], true), 403);
        return DB::transaction(function () use ($user, $code) {
            $voucher = DB::table('loyalty.reward_vouchers')->where('code', $code)
                ->when($user->role !== 'SUPERADMIN', fn ($query) => $query->whereIn('business_id', app(BusinessAccessService::class)->businessIds($user)))
                ->lockForUpdate()->first();
            abort_unless($voucher, 404);
            if ($voucher->status === 'USED') return $voucher;
            abort_unless($voucher->status === 'AVAILABLE' && now()->lt($voucher->expires_at), 422, 'Este beneficio venció o no está disponible.');
            DB::table('loyalty.reward_vouchers')->where('id', $voucher->id)->update(['status' => 'USED', 'used_at' => now(), 'used_by' => $user->id, 'updated_at' => now()]);
            $clientUserId = Client::whereKey($voucher->client_id)->value('user_id');
            if ($clientUserId) app(NotificationService::class)->sendToUser((int) $clientUserId, 'LOYALTY_REWARD_DELIVERED',
                'Premio entregado', $voucher->reward, ['voucher_id' => $voucher->id, 'business_id' => $voucher->business_id, 'url' => '/cliente/benefits']);
            DB::afterCommit(fn () => app(ResourceChangePublisher::class)->record('loyalty.reward_vouchers', [(array) $voucher]));
            return DB::table('loyalty.reward_vouchers')->find($voucher->id);
        }, 3);
    }
}
