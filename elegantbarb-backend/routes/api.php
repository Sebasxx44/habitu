<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\RolesController;
use App\Http\Controllers\Api\PermissionsController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\UserConfigurationController;
use App\Http\Controllers\Api\FavoriteShopController;
use Illuminate\Support\Facades\Route;

// ─── Auth (public) ───────────────────────────
Route::get('/auth/config', [AuthController::class, 'configuration']);
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/auth/login-google', [AuthController::class, 'loginWithGoogle'])->middleware('throttle:5,1');
Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:3,1');
Route::post('/auth/forgot-password', [\App\Http\Controllers\PasswordRecoveryController::class, 'request'])->middleware('throttle:3,1');
Route::post('/auth/reset-password', [\App\Http\Controllers\PasswordRecoveryController::class, 'reset'])->middleware('throttle:5,1');

// ─── Health ──────────────────────────────────
Route::get('/health', \App\Http\Controllers\HealthCheckController::class);

// Opaque recipient tokens authenticate email events without exposing account identifiers.
Route::prefix('campaign-events')->middleware('throttle:120,1')->group(function () {
    Route::get('{token}/open', [\App\Http\Controllers\CampaignEventController::class, 'open'])->whereUuid('token')->name('campaign-events.open');
    Route::get('{token}/click', [\App\Http\Controllers\CampaignEventController::class, 'click'])->whereUuid('token')->name('campaign-events.click');
    Route::match(['get', 'post'], '{token}/unsubscribe', [\App\Http\Controllers\CampaignEventController::class, 'unsubscribe'])->whereUuid('token')->name('campaign-events.unsubscribe');
});

// ─── Protected (auth:sanctum) ────────────────
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh-token', [AuthController::class, 'refreshToken']);
    Route::get('/auth/users', [AuthController::class, 'users']);
    Route::post('/auth/users', [AuthController::class, 'createUser']);
    Route::put('/auth/users/{user}', [AuthController::class, 'updateUser']);
    Route::delete('/auth/users/{user}', [AuthController::class, 'deleteUser']);

    Route::prefix('profile')->group(function () {
        Route::get('/', [\App\Modules\Accounts\Http\Controllers\ProfileController::class, 'show']);
        Route::put('/', [\App\Modules\Accounts\Http\Controllers\ProfileController::class, 'update']);
        Route::put('preferences', [\App\Modules\Accounts\Http\Controllers\ProfileController::class, 'preferences']);
        Route::post('avatar', [\App\Modules\Accounts\Http\Controllers\ProfileController::class, 'avatar'])->middleware('throttle:10,1');
        Route::delete('avatar', [\App\Modules\Accounts\Http\Controllers\ProfileController::class, 'deleteAvatar']);
        Route::put('email', [\App\Modules\Accounts\Http\Controllers\ProfileController::class, 'email'])->middleware('throttle:5,1');
        Route::put('password', [\App\Modules\Accounts\Http\Controllers\ProfileController::class, 'password'])->middleware('throttle:5,1');
    });

    // 2FA
    Route::get('/auth/2fa/setup', [\App\Http\Controllers\TwoFactorAuthController::class, 'setup']);
    Route::post('/auth/2fa/enable', [\App\Http\Controllers\TwoFactorAuthController::class, 'enable']);
    Route::post('/auth/2fa/disable', [\App\Http\Controllers\TwoFactorAuthController::class, 'disable']);
    Route::get('/auth/2fa/status', [\App\Http\Controllers\TwoFactorAuthController::class, 'status']);

    // Roles & Permissions (keep — no V2 equivalent yet)
    Route::get('/roles', [RolesController::class, 'index']);
    Route::post('/roles', [RolesController::class, 'store']);
    Route::put('/roles/{role}', [RolesController::class, 'update']);
    Route::delete('/roles/{role}', [RolesController::class, 'destroy']);
    Route::get('/permissions', [PermissionsController::class, 'index']);

    // User Config
    Route::get('/user-configurations', [UserConfigurationController::class, 'index']);
    Route::put('/user-configurations', [UserConfigurationController::class, 'update']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    // Favorites
    Route::get('/barber-shops/favorites', [FavoriteShopController::class, 'index']);
    Route::post('/barber-shops/{shopId}/favorite', [FavoriteShopController::class, 'toggle']);

    // SSE stream
    Route::get('/notifications/stream', function (\Illuminate\Http\Request $request) {
        $user = $request->user();
        return response()->stream(function () use ($user) {
            $lastCheck = time();
            while (true) {
                if (connection_aborted()) break;
                $since = $lastCheck;
                $lastCheck = time();
                $new = \App\Models\Notification::where('user_id', $user->id)
                    ->where('created_at', '>=', date('Y-m-d H:i:s', $since))
                    ->where('read', false)
                    ->get();
                if ($new->count() > 0) {
                    echo "data: " . json_encode(['type' => 'notification', 'notifications' => $new]) . "\n\n";
                    ob_flush(); flush();
                }
                echo "data: " . json_encode(['type' => 'ping', 'time' => time()]) . "\n\n";
                ob_flush(); flush();
                sleep(15);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    });

    Route::get('/analytics/health', [\App\Modules\Analytics\Http\Controllers\MarketplaceHealthController::class, 'overview']);
    Route::get('/analytics/health/operations', [\App\Modules\Analytics\Http\Controllers\MarketplaceHealthController::class, 'operations']);
    Route::get('/analytics/health/features', [\App\Modules\Analytics\Http\Controllers\MarketplaceHealthController::class, 'features']);
    Route::put('/analytics/health/features/{flag}', [\App\Modules\Analytics\Http\Controllers\MarketplaceHealthController::class, 'updateFeature']);
    Route::get('/analytics/health/classifications', [\App\Modules\Analytics\Http\Controllers\MarketplaceHealthController::class, 'classifications']);
    Route::put('/analytics/health/classifications/{id}', [\App\Modules\Analytics\Http\Controllers\MarketplaceHealthController::class, 'classify'])->whereNumber('id');
    Route::get('/analytics/preferences', [\App\Modules\Analytics\Http\Controllers\TelemetryController::class, 'preferences']);
    Route::put('/analytics/preferences', [\App\Modules\Analytics\Http\Controllers\TelemetryController::class, 'updatePreferences']);
    Route::post('/analytics/events', [\App\Modules\Analytics\Http\Controllers\TelemetryController::class, 'store'])->middleware('throttle:120,1');
    Route::get('/analytics/businesses', [\App\Modules\Analytics\Http\Controllers\AnalyticsController::class, 'businesses']);
    Route::get('/analytics/platform', [\App\Modules\Analytics\Http\Controllers\AnalyticsController::class, 'platform']);
    Route::get('/analytics/businesses/{businessId}', [\App\Modules\Analytics\Http\Controllers\AnalyticsController::class, 'business'])->whereNumber('businessId');

    Route::get('/dashboard/overview', \App\Modules\Platform\Http\Controllers\DashboardOverviewController::class);

    // Legacy dashboard (DashboardRepository already uses V2 models)
    Route::get('/dashboard/superadmin', [\App\Http\Controllers\DashboardController::class, 'superadmin'])->middleware('role:SUPERADMIN');
    Route::get('/dashboard/admin-barberia', [\App\Http\Controllers\DashboardController::class, 'adminBarberia'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::get('/dashboard/barbero', [\App\Http\Controllers\DashboardController::class, 'barbero'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA,PROFESSIONAL');
    Route::get('/dashboard/cliente', [\App\Http\Controllers\DashboardController::class, 'cliente'])->middleware('role:CLIENTE');
    Route::get('/dashboard/shops-map', [\App\Http\Controllers\DashboardController::class, 'shopsMap']);
    Route::get('/dashboard/income-chart', [\App\Http\Controllers\DashboardController::class, 'incomeChart'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA,PROFESSIONAL');

    Route::get('/loyalty/mine', [\App\Modules\Loyalty\Http\Controllers\ClientLoyaltyController::class, 'index'])->middleware('role:CLIENTE,SUPERADMIN');
    Route::post('/loyalty/mine/{card}/redeem', [\App\Modules\Loyalty\Http\Controllers\ClientLoyaltyController::class, 'redeem'])->middleware(['role:CLIENTE,SUPERADMIN', 'throttle:10,1']);

    // Legacy loyalty → V2 loyalty tables (still needed by frontend AdminLoyaltyPage)
    Route::get('/loyalty/cards', [\App\Http\Controllers\LoyaltyController::class, 'index'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::get('/loyalty/stats', [\App\Http\Controllers\LoyaltyController::class, 'stats'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::get('/loyalty/cards/{card}', [\App\Http\Controllers\LoyaltyController::class, 'show'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::get('/loyalty/programs', [\App\Http\Controllers\LoyaltyController::class, 'programs'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::post('/loyalty/programs', [\App\Http\Controllers\LoyaltyController::class, 'storeProgram'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::put('/loyalty/programs/{program}', [\App\Http\Controllers\LoyaltyController::class, 'updateProgram'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::delete('/loyalty/programs/{program}', [\App\Http\Controllers\LoyaltyController::class, 'deleteProgram'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::post('/loyalty/cards/{card}/stamp', [\App\Http\Controllers\LoyaltyController::class, 'addStamp'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::post('/loyalty/cards/{card}/redeem', [\App\Http\Controllers\LoyaltyController::class, 'redeemReward'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');

    // Campaign administration, audience preview and delivery history.
    Route::get('/campaigns', [\App\Http\Controllers\CampaignController::class, 'index'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::get('/campaigns/options', [\App\Http\Controllers\CampaignController::class, 'options'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::get('/campaigns/audience-preview', [\App\Http\Controllers\CampaignController::class, 'audiencePreview'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::post('/campaigns', [\App\Http\Controllers\CampaignController::class, 'store'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::get('/campaigns/{campaign}', [\App\Http\Controllers\CampaignController::class, 'show'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::put('/campaigns/{campaign}', [\App\Http\Controllers\CampaignController::class, 'update'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::post('/campaigns/{campaign}/send', [\App\Http\Controllers\CampaignController::class, 'send'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::get('/campaigns/{campaign}/stats', [\App\Http\Controllers\CampaignController::class, 'stats'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
    Route::delete('/campaigns/{campaign}', [\App\Http\Controllers\CampaignController::class, 'destroy'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');

    Route::prefix('reports/exports')->middleware('role:SUPERADMIN,ADMIN_BARBERIA')->group(function () {
        Route::get('/', [\App\Modules\Reports\Controllers\ReportExportController::class, 'index']);
        Route::post('/', [\App\Modules\Reports\Controllers\ReportExportController::class, 'store'])->middleware('throttle:10,1');
        Route::get('/{id}', [\App\Modules\Reports\Controllers\ReportExportController::class, 'show'])->whereUuid('id');
        Route::post('/{id}/download-link', [\App\Modules\Reports\Controllers\ReportExportController::class, 'downloadLink'])->whereUuid('id')->middleware('throttle:10,1');
        Route::get('/{id}/download', [\App\Modules\Reports\Controllers\ReportExportController::class, 'download'])->whereUuid('id')->middleware('throttle:10,1');
    });

    // Legacy reports (still used by AdminReportsPage)
    Route::get('/reports/detailed', [\App\Http\Controllers\Api\ReportController::class, 'getDetailedReport'])->middleware('role:SUPERADMIN,ADMIN_BARBERIA');
});

// ─── V2 Modular API ──────────────────────────
Route::get('/reports/exports/{id}/file', [\App\Modules\Reports\Controllers\ReportExportController::class, 'signedDownload'])
    ->name('report-exports.file')->whereUuid('id')->middleware(['signed:relative', 'throttle:10,1']);

require __DIR__ . '/modules.php';
