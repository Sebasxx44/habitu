<?php

namespace App\Modules\Analytics\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

final class TelemetryController extends Controller
{
    public const EVENTS = ['visit', 'search', 'business_view', 'service_view', 'booking_start', 'slot_selected', 'booking_confirmed', 'assistant_conversation', 'assistant_search', 'assistant_recommendations', 'assistant_click'];

    public function preferences(Request $request)
    {
        $row = DB::table('platform.analytics_preferences')->where('user_id', $request->user()->id)->first();
        return response()->json(['measurement' => (bool) ($row?->measurement ?? false), 'personalization' => (bool) ($row?->personalization ?? false), 'enabled' => (bool) config('analytics.enabled')])->header('Cache-Control', 'private, no-store');
    }

    public function updatePreferences(Request $request)
    {
        $data = $request->validate(['measurement' => ['required', 'boolean'], 'personalization' => ['required', 'boolean']]);
        DB::transaction(function () use ($request, $data) {
            DB::table('platform.analytics_preferences')->updateOrInsert(['user_id' => $request->user()->id], [...$data, 'updated_at' => now(), 'created_at' => now()]);
            if (! $data['measurement']) {
                DB::table('platform.marketplace_events')->where('actor_hash', $this->actor($request->user()->id))->delete();
                app(\App\Modules\Marketing\Services\AdMeasurementService::class)->forget($request->user()->id);
                app(\App\Modules\Marketing\Services\RetentionAttributionService::class)->forget($request->user()->id);
            }
        });
        return $this->preferences($request);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->role === User::ROLE_CLIENT, 403);
        $data = $request->validate([
            'event_id' => ['required', 'uuid'], 'session_id' => ['required', 'uuid'], 'event' => ['required', Rule::in(self::EVENTS)],
            'source' => ['required', 'in:marketplace,assistant,express'], 'business_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'service_id' => ['sometimes', 'nullable', 'integer', 'min:1'], 'category_id' => ['sometimes', 'nullable', 'integer', Rule::exists('pgsql.platform.business_categories', 'id')],
            'appointment_id' => ['required_if:event,booking_confirmed', 'nullable', 'integer', 'min:1'],
            'conversation_id' => ['sometimes', 'nullable', 'uuid'], 'results_count' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000'],
            'query' => ['prohibited'], 'message' => ['prohibited'], 'text' => ['prohibited'], 'lat' => ['prohibited'], 'lng' => ['prohibited'],
        ]);
        $accepted = DB::transaction(function () use ($request, $data) {
            $preference = DB::table('platform.analytics_preferences')->where('user_id', $request->user()->id)->lockForUpdate()->first();
            if (! config('analytics.enabled') || ! $preference?->measurement) return false;
            if (! empty($data['service_id'])) {
                $service = Service::where('is_active', true)->findOrFail($data['service_id']);
                abort_if(! empty($data['business_id']) && (int) $data['business_id'] !== (int) $service->business_id, 422);
                $data['business_id'] = $service->business_id;
            }
            if (! empty($data['business_id'])) {
                $business = Business::findOrFail($data['business_id']);
                $data['category_id'] = $business->business_category_id;
            }
            if ($data['event'] === 'booking_confirmed') {
                $appointment = Appointment::whereHas('client', fn ($query) => $query->where('user_id', $request->user()->id))->findOrFail($data['appointment_id']);
                $data['business_id'] = $appointment->business_id;
                $data['service_id'] = $appointment->service_id;
                $data['category_id'] = Business::find($appointment->business_id)?->business_category_id;
            } else unset($data['appointment_id']);
            DB::table('platform.marketplace_events')->insertOrIgnore([...$data, 'actor_hash' => $this->actor($request->user()->id), 'created_at' => now()]);
            return true;
        });
        return response()->json(['accepted' => $accepted], 202);
    }

    private function actor(int $userId): string
    {
        return hash_hmac('sha256', (string) $userId, config('app.key'));
    }
}
