<?php

namespace App\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Services\TwoFactorAuthService;
use Illuminate\Http\Request;

class TwoFactorAuthController extends Controller
{
    public function __construct(protected TwoFactorAuthService $service) {}

    public function setup(Request $request)
    {
        $user = $request->user();
        $data = $this->service->generateSecret($user);

        return ServiceResponse::success($data, 'Configuración 2FA generada')->toJsonResponse();
    }

    public function enable(Request $request)
    {
        $request->validate(['code' => 'required|string|size:6']);
        $user = $request->user();

        $success = $this->service->enable($user, $request->code);
        if (! $success) {
            return ServiceResponse::error('Código inválido', null, 422)->toJsonResponse();
        }

        return ServiceResponse::success(null, '2FA activado exitosamente')->toJsonResponse();
    }

    public function disable(Request $request)
    {
        $request->validate(['code' => 'required|string']);
        $user = $request->user();

        $success = $this->service->disable($user, $request->code);
        if (! $success) {
            return ServiceResponse::error('Código inválido', null, 422)->toJsonResponse();
        }

        return ServiceResponse::success(null, '2FA desactivado')->toJsonResponse();
    }

    public function verify(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer',
            'code' => 'required|string',
        ]);

        $user = \App\Models\User::find($request->user_id);
        if (! $user) {
            return ServiceResponse::error('Usuario no encontrado', null, 404)->toJsonResponse();
        }

        $valid = $this->service->verify($user, $request->code)
            || $this->service->verifyRecoveryCode($user, $request->code);

        return ServiceResponse::success(['valid' => $valid], 'Verificación 2FA')->toJsonResponse();
    }

    public function status(Request $request)
    {
        $user = $request->user();
        return ServiceResponse::success([
            'enabled' => $this->service->isEnabled($user),
        ], 'Estado 2FA')->toJsonResponse();
    }
}
