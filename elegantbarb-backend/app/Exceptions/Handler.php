<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PDOException;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->renderable(fn (PDOException $exception, Request $request): ?JsonResponse =>
            $request->is('api/*') || $request->expectsJson()
                ? response()->json([
                    'success' => false,
                    'message' => 'No pudimos completar la solicitud. Intenta de nuevo en unos momentos.',
                    'error' => 'DATA_ACCESS_ERROR',
                ], 500)
                : null
        );
    }
}
