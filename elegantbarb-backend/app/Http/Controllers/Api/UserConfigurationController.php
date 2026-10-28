<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserConfiguration;
use Illuminate\Http\Request;

class UserConfigurationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $configs = UserConfiguration::where('user_id', $user->id)->get();
        $data = $configs->pluck('value', 'key')->toArray();
        foreach ($configs as $c) {
            if ($c->type === 'json') $data[$c->key] = json_decode($c->value, true);
        }
        return compact('data');
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $configs = $request->validate(['configs' => 'required|array']);
        foreach ($configs['configs'] as $key => $item) {
            UserConfiguration::updateOrCreate(
                ['user_id' => $user->id, 'key' => $key],
                ['value' => is_array($item['value'] ?? null) ? json_encode($item['value']) : (string) ($item['value'] ?? ''), 'type' => $item['type'] ?? 'string']
            );
        }
        return ['message' => 'Configuración actualizada'];
    }
}