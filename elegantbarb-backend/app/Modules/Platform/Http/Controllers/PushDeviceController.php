<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Services\PushNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

class PushDeviceController extends Controller
{
    public function status(Request $request, PushNotificationService $sender): JsonResponse
    {
        $preferences = DB::table('platform.push_preferences')->where('user_id', $request->user()->id)->first();
        $configured = $sender->configured() && config('push.vapid_key') && ! in_array(null, config('push.web'), true);
        return ServiceResponse::success(['configured' => (bool) $configured,
            'web_config' => $configured ? config('push.web') : null, 'vapid_key' => $configured ? config('push.vapid_key') : null,
            'registered_devices' => DB::table('platform.push_devices')->where('user_id', $request->user()->id)->whereNull('revoked_at')->count(),
            'transactional_enabled' => (bool) $preferences?->transactional_enabled,
            'promotions_enabled' => (bool) $preferences?->promotions_enabled,
        ])->toJsonResponse();
    }

    public function register(Request $request, PushNotificationService $sender): JsonResponse
    {
        abort_unless($sender->configured(), 503, 'Push no está configurado.');
        $data = $request->validate(['token' => 'required|string|min:20|max:4096', 'platform' => 'required|in:web',
            'transactional_enabled' => 'required|boolean', 'promotions_enabled' => 'required|boolean']);
        DB::transaction(function () use ($data, $request) {
            DB::table('platform.push_devices')->updateOrInsert(['token_hash' => hash('sha256', $data['token'])], [
                'user_id' => $request->user()->id, 'token' => Crypt::encryptString($data['token']), 'platform' => 'web',
                'last_seen_at' => now(), 'revoked_at' => null, 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('platform.push_preferences')->updateOrInsert(['user_id' => $request->user()->id], [
                'transactional_enabled' => $data['transactional_enabled'], 'promotions_enabled' => $data['promotions_enabled'],
                'created_at' => now(), 'updated_at' => now(),
            ]);
        });
        return ServiceResponse::success(null, 'Dispositivo registrado con tus preferencias')->toJsonResponse();
    }

    public function unregister(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => 'required|string|max:4096']);
        DB::table('platform.push_devices')->where('user_id', $request->user()->id)->where('token_hash', hash('sha256', $data['token']))
            ->update(['revoked_at' => now(), 'updated_at' => now()]);
        return ServiceResponse::success(null, 'Notificaciones desactivadas en este dispositivo')->toJsonResponse();
    }
}
