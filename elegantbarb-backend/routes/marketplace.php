<?php

use App\Modules\Booking\Http\Controllers\GroupCoordinationController;
use App\Modules\Booking\Http\Controllers\OperationalBlockController;
use App\Modules\Booking\Http\Controllers\ReservationLifecycleController;
use App\Modules\Booking\Http\Controllers\ResourceController;
use App\Modules\Chat\Http\Controllers\ChatAttachmentController;
use App\Modules\Finance\Http\Controllers\ReservationCheckoutController;
use App\Modules\People\Http\Controllers\ProfessionalOperationsController;
use Illuminate\Support\Facades\Route;

// Controllers resolve ownership from the authenticated actor and persisted record.
Route::get('distribution/go/{id}', [\App\Modules\Marketing\Http\Controllers\BookingDistributionController::class, 'go'])->whereUuid('id')->middleware('throttle:120,1');
Route::get('distribution/widget/{id}', [\App\Modules\Marketing\Http\Controllers\BookingDistributionController::class, 'widget'])->whereUuid('id')->middleware('throttle:120,1');
Route::get('public/provider-reviews/{kind}/{id}', [\App\Modules\Platform\Http\Controllers\ProviderReviewController::class, 'publicSummary'])->where(['kind' => 'business|professional', 'id' => '[0-9]+']);
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::prefix('payout-sandbox')->middleware('role:SUPERADMIN')->group(function () {
        Route::get('', [\App\Modules\Finance\Http\Controllers\PayoutSandboxController::class, 'index']);
        Route::post('withdrawals/{id}/prepare', [\App\Modules\Finance\Http\Controllers\PayoutSandboxController::class, 'prepare'])->whereNumber('id')->middleware('throttle:6,1');
        Route::post('attempts/{id}/submit', [\App\Modules\Finance\Http\Controllers\PayoutSandboxController::class, 'submit'])->whereUuid('id')->middleware('throttle:6,1');
        Route::post('attempts/{id}/reconcile', [\App\Modules\Finance\Http\Controllers\PayoutSandboxController::class, 'reconcile'])->whereUuid('id')->middleware('throttle:10,1');
    });
    Route::prefix('distribution')->group(function () {
        Route::get('', [\App\Modules\Marketing\Http\Controllers\BookingDistributionController::class, 'index']);
        Route::put('{businessId}/settings', [\App\Modules\Marketing\Http\Controllers\BookingDistributionController::class, 'settings'])->whereNumber('businessId');
        Route::post('links', [\App\Modules\Marketing\Http\Controllers\BookingDistributionController::class, 'store']);
        Route::delete('links/{id}', [\App\Modules\Marketing\Http\Controllers\BookingDistributionController::class, 'destroy'])->whereUuid('id');
    });
    Route::get('provider-reviews', [\App\Modules\Platform\Http\Controllers\ProviderReviewController::class, 'index']);
    Route::prefix('provider-reviews/{kind}/{id}')->where(['kind' => 'business|professional', 'id' => '[0-9]+'])->group(function () {
        Route::get('', [\App\Modules\Platform\Http\Controllers\ProviderReviewController::class, 'show']);
        Route::post('', [\App\Modules\Platform\Http\Controllers\ProviderReviewController::class, 'store']);
        Route::post('{checkId}/documents', [\App\Modules\Platform\Http\Controllers\ProviderReviewController::class, 'upload'])->whereNumber('checkId');
        Route::get('{checkId}/documents/{documentId}', [\App\Modules\Platform\Http\Controllers\ProviderReviewController::class, 'download'])->whereNumber(['checkId', 'documentId']);
        Route::put('{checkId}/decision', [\App\Modules\Platform\Http\Controllers\ProviderReviewController::class, 'decision'])->whereNumber('checkId');
    });

    Route::post('wompi/orders/{id}/reconcile', [\App\Modules\Finance\Http\Controllers\WompiController::class, 'reconcile'])->whereUuid('id')->middleware('throttle:10,1');
    Route::post('earnings/withdrawals/{id}/cancel', [\App\Modules\Finance\Http\Controllers\EarningsController::class, 'cancelWithdrawal'])->whereNumber('id');
    Route::get('booking/checkout/policy', [ReservationCheckoutController::class, 'policy']);
    Route::post('booking/checkout', [ReservationCheckoutController::class, 'store']);
    Route::put('booking/checkout/policy/{businessId}', [ReservationCheckoutController::class, 'updatePolicy'])->whereNumber('businessId');
    Route::post('wompi/orders/{id}/refunds', [ReservationCheckoutController::class, 'refund'])->whereUuid('id');
    Route::prefix('operations')->group(function () {
        Route::get('context', [ProfessionalOperationsController::class, 'context']);
        Route::put('professionals/{id}/schedule', [ProfessionalOperationsController::class, 'schedule'])->whereNumber('id');
        Route::put('professionals/{id}/services', [ProfessionalOperationsController::class, 'services'])->whereNumber('id');
        Route::post('blocks', [OperationalBlockController::class, 'store']);
        Route::delete('blocks/{id}', [OperationalBlockController::class, 'destroy'])->whereNumber('id');
        Route::put('resources/{id}/services', [ResourceController::class, 'services'])->whereNumber('id');
    });
    Route::prefix('reservations/{kind}/{id}')->where(['kind' => 'appointment|on-demand', 'id' => '[0-9]+'])->group(function () {
        Route::get('', [ReservationLifecycleController::class, 'show']);
        Route::post('conversation', [ReservationLifecycleController::class, 'conversation']);
        Route::post('check-in/pin', [ReservationLifecycleController::class, 'issuePin'])->middleware('throttle:6,1');
        Route::post('check-in/verify', [ReservationLifecycleController::class, 'verifyPin'])->middleware('throttle:10,1');
        Route::post('incidents', [ReservationLifecycleController::class, 'reportIncident']);
        Route::put('incidents/{caseId}', [ReservationLifecycleController::class, 'updateIncident'])->whereNumber('caseId');
    });
    Route::post('chat/conversations/{id}/attachments', [ChatAttachmentController::class, 'store'])->whereNumber('id')->middleware('throttle:10,1');
    Route::get('chat/conversations/{id}/attachments/{attachmentId}', [ChatAttachmentController::class, 'download'])->whereNumber(['id', 'attachmentId']);
    Route::get('referrals', [\App\Modules\Marketing\Http\Controllers\ReferralController::class, 'index'])->middleware('role:CLIENTE');
    Route::post('referrals/apply', [\App\Modules\Marketing\Http\Controllers\ReferralController::class, 'apply'])->middleware(['role:CLIENTE', 'throttle:6,1']);
    Route::match(['get', 'put'], 'referrals/programs/{businessId}', [\App\Modules\Marketing\Http\Controllers\ReferralController::class, 'program'])->whereNumber('businessId');
    Route::match(['get', 'put'], 'contact-preferences', [\App\Modules\Marketing\Http\Controllers\ReferralController::class, 'preferences']);
    Route::prefix('routines')->group(function () {
        Route::get('', [\App\Modules\Booking\Http\Controllers\BookingRoutineController::class, 'index']);
        Route::post('', [\App\Modules\Booking\Http\Controllers\BookingRoutineController::class, 'store']);
        Route::put('{id}', [\App\Modules\Booking\Http\Controllers\BookingRoutineController::class, 'update'])->whereNumber('id');
        Route::get('{id}/preview', [\App\Modules\Booking\Http\Controllers\BookingRoutineController::class, 'preview'])->whereNumber('id');
        Route::post('occurrences/{id}/skip', [\App\Modules\Booking\Http\Controllers\BookingRoutineController::class, 'skip'])->whereNumber('id');
        Route::post('occurrences/{id}/attach', [\App\Modules\Booking\Http\Controllers\BookingRoutineController::class, 'attach'])->whereNumber('id');
    });
    Route::prefix('commerce')->group(function () {
        Route::get('', [\App\Modules\Benefits\Http\Controllers\CommerceController::class, 'index']);
        Route::post('packages', [\App\Modules\Benefits\Http\Controllers\CommerceController::class, 'package']);
        Route::delete('packages/{id}', [\App\Modules\Benefits\Http\Controllers\CommerceController::class, 'deactivatePackage'])->whereNumber('id');
        Route::post('packages/{id}/preview', [\App\Modules\Benefits\Http\Controllers\CommerceController::class, 'preview'])->whereNumber('id');
        Route::post('package-proposals/{id}/confirm', [\App\Modules\Benefits\Http\Controllers\CommerceController::class, 'confirm'])->whereUuid('id');
        Route::post('gifts', [\App\Modules\Benefits\Http\Controllers\CommerceController::class, 'issueGift']);
        Route::post('gifts/claim', [\App\Modules\Benefits\Http\Controllers\CommerceController::class, 'claimGift']);
        Route::post('gifts/redeem', [\App\Modules\Benefits\Http\Controllers\CommerceController::class, 'redeemGift']);
    });
    Route::post('retention-actions/{id}/click', [\App\Modules\Marketing\Http\Controllers\RetentionRecipeController::class, 'click'])->whereNumber('id')->middleware('role:CLIENTE');
    Route::prefix('retention/{businessId}')->whereNumber('businessId')->group(function () {
        Route::get('', [\App\Modules\Marketing\Http\Controllers\RetentionRecipeController::class, 'index']);
        Route::put('recipes', [\App\Modules\Marketing\Http\Controllers\RetentionRecipeController::class, 'save']);
        Route::post('scan', [\App\Modules\Marketing\Http\Controllers\RetentionRecipeController::class, 'scan'])->middleware('throttle:6,1');
        Route::post('actions/{id}/approve', [\App\Modules\Marketing\Http\Controllers\RetentionRecipeController::class, 'approve'])->whereNumber('id');
    });
    Route::get('push/status', [\App\Modules\Platform\Http\Controllers\PushDeviceController::class, 'status']);
    Route::post('push/register', [\App\Modules\Platform\Http\Controllers\PushDeviceController::class, 'register']);
    Route::post('push/unregister', [\App\Modules\Platform\Http\Controllers\PushDeviceController::class, 'unregister']);
    Route::middleware('role:CLIENTE')->prefix('groups')->group(function () {
        Route::get('', [GroupCoordinationController::class, 'index']);
        Route::post('', [GroupCoordinationController::class, 'store']);
        Route::post('join', [GroupCoordinationController::class, 'join'])->middleware('throttle:10,1');
        Route::get('{id}', [GroupCoordinationController::class, 'show'])->whereNumber('id');
        Route::put('{id}', [GroupCoordinationController::class, 'update'])->whereNumber('id');
        Route::post('{id}/invitation', [GroupCoordinationController::class, 'invitation'])->whereNumber('id');
        Route::post('{id}/response', [GroupCoordinationController::class, 'respond'])->whereNumber('id');
    });
});
