<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Core\DTOs\ServiceResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WebhookController extends Controller
{
    public function __construct(private \App\Services\WebhookDestinationService $destinations) {}
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $items = DB::table('platform.outgoing_webhooks')
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();
        return ServiceResponse::success($items, 'Webhooks obtenidos')->toJsonResponse();
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'url' => 'required|url|max:500',
            'events' => 'required|array|max:50',
            'events.*' => 'string|max:100',
        ]);

        $this->destinations->resolve($request->string('url')->toString());
        $id = DB::table('platform.outgoing_webhooks')->insertGetId([
            'user_id' => $request->user()->id,
            'name' => $request->name,
            'url' => $request->url,
            'secret' => bin2hex(random_bytes(16)),
            'events' => json_encode($request->events),
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ServiceResponse::success(['id' => $id], 'Webhook creado', 201)->toJsonResponse();
    }

    public function update(Request $request, int $id)
    {
        $request->validate([
            'name' => 'sometimes|string|max:100',
            'url' => 'sometimes|url|max:500',
            'events' => 'sometimes|array|max:50',
            'events.*' => 'string|max:100',
            'active' => 'sometimes|boolean',
        ]);

        abort_unless(DB::table('platform.outgoing_webhooks')->where('id', $id)->where('user_id', $request->user()->id)->exists(), 404);
        if ($request->filled('url')) $this->destinations->resolve($request->string('url')->toString());
        $update = [];
        if ($request->has('name')) $update['name'] = $request->name;
        if ($request->has('url')) $update['url'] = $request->url;
        if ($request->has('events')) $update['events'] = json_encode($request->events);
        if ($request->has('active')) $update['active'] = $request->active;
        $update['updated_at'] = now();

        DB::table('platform.outgoing_webhooks')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update($update);

        return ServiceResponse::success(null, 'Webhook actualizado')->toJsonResponse();
    }

    public function destroy(Request $request, int $id)
    {
        DB::table('platform.outgoing_webhooks')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return ServiceResponse::success(null, 'Webhook eliminado')->toJsonResponse();
    }

    public function replay(Request $request, int $id)
    {
        app(\App\Modules\Platform\Services\MarketplaceOutbox::class)->replay($request->user(), $id);
        return ServiceResponse::success(null, 'Entrega encolada para reintento')->toJsonResponse();
    }

    public function deliveries(Request $request, int $id)
    {
        $ownsWebhook = DB::table('platform.outgoing_webhooks')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->exists();

        if (! $ownsWebhook) {
            return ServiceResponse::forbidden('Webhook no autorizado')->toJsonResponse();
        }

        $items = DB::table('platform.webhook_deliveries')
            ->where('webhook_id', $id)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return ServiceResponse::success($items, 'Entregas obtenidas')->toJsonResponse();
    }
}
