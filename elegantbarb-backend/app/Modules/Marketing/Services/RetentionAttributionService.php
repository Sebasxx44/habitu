<?php

namespace App\Modules\Marketing\Services;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use Illuminate\Support\Facades\DB;

final class RetentionAttributionService
{
    public function click(User $user, int $id): void
    {
        $query = DB::table('marketing.retention_actions')->where('id', $id)->where('user_id', $user->id)->where('state', 'NOTIFIED_IN_APP');
        abort_unless((clone $query)->exists(), 404);
        if ($this->consents($user->id)) $query->whereNull('clicked_at')->update(['clicked_at' => now(), 'updated_at' => now()]);
    }

    public function attribute(Appointment $appointment): void
    {
        $userId = $appointment->client?->user_id;
        if (! $userId || ! $this->consents($userId) || in_array(strtolower((string) $appointment->source), ['demo', 'test'], true)) return;
        $action = DB::table('marketing.retention_actions as action')->join('marketing.retention_recipes as recipe', 'recipe.id', '=', 'action.recipe_id')
            ->where('recipe.business_id', $appointment->business_id)->where('action.user_id', $userId)->where('action.state', 'NOTIFIED_IN_APP')
            ->whereBetween('action.clicked_at', [now()->subDays(7), now()])->orderByDesc('action.clicked_at')->first(['action.id']);
        if ($action) DB::table('marketing.retention_attributions')->insertOrIgnore(['action_id' => $action->id, 'appointment_id' => $appointment->id, 'created_at' => now()]);
    }

    public function completions(int $actionId): int
    {
        return DB::table('marketing.retention_attributions as attribution')->join('booking.appointments as appointment', 'appointment.id', '=', 'attribution.appointment_id')
            ->where('attribution.action_id', $actionId)->where('appointment.status', 'COMPLETED')->whereNull('appointment.deleted_at')
            ->where(fn ($query) => $query->whereNull('appointment.source')->orWhereNotIn(DB::raw('LOWER(appointment.source)'), ['demo', 'test']))
            ->whereNotExists(fn ($query) => $query->selectRaw('1')->from('finance.checkout_orders as sandbox')->whereColumn('sandbox.target_id', 'appointment.id')->where('sandbox.purpose', 'reservation')->where('sandbox.environment', 'test'))->count();
    }

    public function forget(int $userId): void
    {
        DB::table('marketing.retention_attributions')->whereIn('action_id', DB::table('marketing.retention_actions')->where('user_id', $userId)->select('id'))->delete();
        DB::table('marketing.retention_actions')->where('user_id', $userId)->whereNotNull('clicked_at')->update(['clicked_at' => null, 'updated_at' => now()]);
    }

    private function consents(int $userId): bool
    {
        return (bool) config('analytics.enabled') && DB::table('platform.analytics_preferences')->where('user_id', $userId)->where('measurement', true)->exists();
    }
}
