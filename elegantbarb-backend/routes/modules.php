<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Business\Http\Controllers\BusinessController;
use App\Modules\Business\Http\Controllers\BranchController;
use App\Modules\People\Http\Controllers\ProfessionalController;
use App\Modules\People\Http\Controllers\ClientController;
use App\Modules\Booking\Http\Controllers\AppointmentController;
use App\Modules\Booking\Http\Controllers\ResourceController;
use App\Modules\Catalog\Http\Controllers\ServiceController;
use App\Modules\Reviews\Http\Controllers\ReviewController;
use App\Modules\Loyalty\Http\Controllers\LoyaltyController;
use App\Modules\Marketing\Http\Controllers\CampaignController;
use App\Modules\Finance\Http\Controllers\PaymentController;
use App\Modules\Platform\Http\Controllers\DashboardController;
use App\Modules\Subscriptions\Http\Controllers\SubscriptionController;
use App\Modules\Chat\Http\Controllers\ChatController;
use App\Modules\Tracking\Http\Controllers\TrackingController;
use App\Modules\Platform\Http\Controllers\RecommendationController;
use App\Modules\Platform\Http\Controllers\AutomationController;
use App\Modules\Marketing\Http\Controllers\AdController;
use App\Modules\Marketing\Http\Controllers\PromotionController;
use App\Modules\OnDemand\Http\Controllers\OnDemandController;
use App\Modules\Finance\Http\Controllers\WalletController;
use App\Modules\Finance\Http\Controllers\WompiController;
use App\Modules\Finance\Http\Controllers\MercadoPagoController;
use App\Modules\Finance\Http\Controllers\EarningsController;
use App\Modules\Booking\Http\Controllers\WaitlistController;
use App\Modules\Platform\Http\Controllers\WebhookController;
use App\Modules\Platform\Http\Controllers\AIChatbotController;
use App\Modules\Platform\Http\Controllers\GamificationController;
use App\Modules\Catalog\Http\Controllers\DynamicPricingController;
use App\Modules\Finance\Http\Controllers\BNPLController;
use App\Modules\Finance\Http\Controllers\SplitPaymentController;
use App\Modules\Booking\Http\Controllers\SmartQueueController;
use App\Modules\Subscriptions\Http\Controllers\MembershipController;
use App\Modules\Platform\Http\Controllers\WhatsAppWebhookController;
use App\Modules\Platform\Http\Controllers\GoogleCalendarController;

Route::prefix('v2')->group(function () {

    require __DIR__.'/marketplace.php';

    Route::prefix('public')->group(function () {
        Route::get('businesses', [\App\Modules\Business\Http\Controllers\PublicCatalogController::class, 'index']);
        Route::get('businesses/slug/{slug}', [\App\Modules\Business\Http\Controllers\PublicCatalogController::class, 'bySlug']);
        Route::get('businesses/{id}', [\App\Modules\Business\Http\Controllers\PublicCatalogController::class, 'show'])->whereNumber('id');
        Route::get('availability', [\App\Modules\Business\Http\Controllers\PublicCatalogController::class, 'availability']);
    });

    Route::middleware(['auth:sanctum', 'throttle:api'])->prefix('favorites')->group(function () {
        Route::get('/', [\App\Modules\People\Http\Controllers\FavoriteController::class, 'index']);
        Route::get('ids', [\App\Modules\People\Http\Controllers\FavoriteController::class, 'identifiers']);
        Route::put('{type}/{id}', [\App\Modules\People\Http\Controllers\FavoriteController::class, 'store'])->whereIn('type', ['business', 'service', 'professional'])->whereNumber('id');
        Route::delete('{type}/{id}', [\App\Modules\People\Http\Controllers\FavoriteController::class, 'destroy'])->whereIn('type', ['business', 'service', 'professional'])->whereNumber('id');
    });

    // Public Business Routes
    Route::prefix('businesses')->group(function () {
        Route::get('search', [BusinessController::class, 'search']);
        Route::get('suggestions', [BusinessController::class, 'suggestions'])->middleware('throttle:60,1');
        Route::get('intent', [BusinessController::class, 'intent'])->middleware('throttle:20,1');
        Route::get('categories', [BusinessController::class, 'categories']);
        Route::get('/', [BusinessController::class, 'index']);
        Route::get('slug/{slug}', [BusinessController::class, 'bySlug']);
        Route::get('{id}', [BusinessController::class, 'show']);
    });

    // Public Subscription Routes
    Route::prefix('subscriptions')->group(function () {
        Route::get('plans', [SubscriptionController::class, 'plans']);
    });

    // Public Ads & Promotions
    Route::prefix('ads')->group(function () {
        Route::get('/', [AdController::class, 'index']);
        Route::post('{id}/click', [AdController::class, 'click']);
        Route::post('{id}/impression', [AdController::class, 'impression'])->whereNumber('id')->middleware('throttle:120,1');
    });

    Route::get('promotions', [PromotionController::class, 'index']);

    // === PUBLIC STRATEGIC FEATURES (Read-only) ===
    // Anyone can view membership plans, queue status, and calculate prices
    Route::get('memberships/plans', [MembershipController::class, 'plans']);
    Route::get('smart-queues', [SmartQueueController::class, 'index']);
    Route::get('smart-queues/{queueId}', [SmartQueueController::class, 'show']);

    Route::middleware(['auth:sanctum', 'throttle:api', 'role:CLIENTE,SUPERADMIN'])->prefix('benefits')->group(function () {
        Route::get('/', [\App\Modules\Benefits\Http\Controllers\BenefitsController::class, 'index']);
        Route::post('programs/{program}/join', [\App\Modules\Benefits\Http\Controllers\BenefitsController::class, 'enroll']);
        Route::post('plans/{plan}/subscribe', [\App\Modules\Benefits\Http\Controllers\BenefitsController::class, 'subscribe']);
        Route::post('memberships/{membership}/cancel', [\App\Modules\Benefits\Http\Controllers\BenefitsController::class, 'cancel']);
    });
    Route::middleware(['auth:sanctum', 'throttle:api', 'role:ADMIN_BARBERIA,SUPERADMIN'])->prefix('benefits/admin')->group(function () {
        Route::get('/', [\App\Modules\Benefits\Http\Controllers\BenefitsAdminController::class, 'index']);
        Route::get('cards/{card}', [\App\Modules\Benefits\Http\Controllers\BenefitsAdminController::class, 'card']);
        Route::post('cards/{card}/stamp', [\App\Modules\Benefits\Http\Controllers\BenefitsAdminController::class, 'stamp']);
        Route::post('vouchers/consume', [\App\Modules\Benefits\Http\Controllers\BenefitsAdminController::class, 'consume']);
        Route::post('{kind}', [\App\Modules\Benefits\Http\Controllers\BenefitsAdminController::class, 'save'])->whereIn('kind', ['programs', 'plans', 'promotions']);
        Route::put('{kind}/{id}', [\App\Modules\Benefits\Http\Controllers\BenefitsAdminController::class, 'save'])->whereIn('kind', ['programs', 'plans', 'promotions']);
        Route::delete('{kind}/{id}', [\App\Modules\Benefits\Http\Controllers\BenefitsAdminController::class, 'destroy'])->whereIn('kind', ['programs', 'plans', 'promotions']);
    });

    // Protected Routes
    Route::middleware(['auth:sanctum', 'throttle:api', \App\Http\Middleware\EnsureBusinessAccess::class])->group(function () {

        // Tracking Routes
        Route::prefix('tracking')->group(function () {
            Route::post('location', [TrackingController::class, 'update']);
            Route::get('professionals/{professionalId}/location', [TrackingController::class, 'latest']);
            Route::get('professionals/{professionalId}/history', [TrackingController::class, 'history']);
        });

        // Recommendations Routes
        Route::get('recommendations', [RecommendationController::class, 'index']);

        // Automation Routes
        Route::prefix('automation')->group(function () {
            Route::post('on-demand/{requestId}/auto-assign', [AutomationController::class, 'autoAssignOnDemand']);
            Route::post('appointments/{appointmentId}/auto-accept', [AutomationController::class, 'autoAcceptAppointment']);
            Route::post('dynamic-price', [AutomationController::class, 'dynamicPrice']);
        });

        // Ad management
        Route::prefix('ads')->group(function () {
            Route::post('/', [AdController::class, 'store']);
            Route::get('my', [AdController::class, 'myAds']);
            Route::get('manage', [AdController::class, 'manage']);
            Route::put('{id}', [AdController::class, 'update'])->whereNumber('id');
            Route::post('{id}/status', [AdController::class, 'status'])->whereNumber('id');
            Route::post('{id}/moderate', [AdController::class, 'moderate'])->whereNumber('id');
            Route::delete('{id}', [AdController::class, 'destroy'])->whereNumber('id');
        });

        // Promotions management
        Route::prefix('promotions')->group(function () {
            Route::post('validate', [PromotionController::class, 'validateCode']);
            Route::get('manage', [PromotionController::class, 'managed']);
            Route::get('{id}/stats', [PromotionController::class, 'stats']);
            Route::put('{id}', [PromotionController::class, 'update']);
            Route::delete('{id}', [PromotionController::class, 'destroy']);
            Route::post('/', [PromotionController::class, 'store']);
        });

        // Business management
        Route::prefix('businesses')->group(function () {
            Route::post('/', [BusinessController::class, 'store']);
            Route::put('{id}', [BusinessController::class, 'update']);
            Route::delete('{id}', [BusinessController::class, 'destroy']);
        });

        // Branch Routes
        Route::prefix('branches')->group(function () {
            Route::get('/', [BranchController::class, 'index']);
            Route::post('/', [BranchController::class, 'store']);
            Route::get('{id}', [BranchController::class, 'show']);
            Route::put('{id}', [BranchController::class, 'update']);
            Route::delete('{id}', [BranchController::class, 'destroy']);
        });

        // Professional Routes
        Route::prefix('professionals')->group(function () {
            Route::get('/', [ProfessionalController::class, 'index']);
            Route::get('stats', [ProfessionalController::class, 'stats']);
            Route::post('/', [ProfessionalController::class, 'store']);
            Route::get('{id}', [ProfessionalController::class, 'show']);
            Route::put('{id}', [ProfessionalController::class, 'update']);
            Route::delete('{id}', [ProfessionalController::class, 'destroy']);
            Route::get('{id}/availability', [ProfessionalController::class, 'availability']);
        });

        // Service Routes
        Route::prefix('services')->group(function () {
            Route::get('/', [ServiceController::class, 'index']);
            Route::post('/', [ServiceController::class, 'store']);
            Route::get('{id}/stats', [ServiceController::class, 'stats']);
            Route::get('{id}', [ServiceController::class, 'show']);
            Route::put('{id}', [ServiceController::class, 'update']);
            Route::delete('{id}', [ServiceController::class, 'destroy']);
        });

        // Client Routes
        Route::prefix('clients')->group(function () {
            Route::get('/', [ClientController::class, 'index']);
            Route::get('stats', [ClientController::class, 'stats']);
            Route::post('/', [ClientController::class, 'store']);
            Route::get('{id}', [ClientController::class, 'show']);
            Route::put('{id}', [ClientController::class, 'update']);
            Route::delete('{id}', [ClientController::class, 'destroy']);
        });

        // Resource Routes
        Route::prefix('resources')->group(function () {
            Route::get('/', [ResourceController::class, 'index']);
            Route::post('/', [ResourceController::class, 'store']);
            Route::get('{id}', [ResourceController::class, 'show']);
            Route::put('{id}', [ResourceController::class, 'update']);
            Route::delete('{id}', [ResourceController::class, 'destroy']);
        });

        // Appointment Routes
        Route::prefix('appointments')->group(function () {
            Route::get('/', [AppointmentController::class, 'index']);
            Route::post('/', [AppointmentController::class, 'store']);
            Route::get('stats', [AppointmentController::class, 'stats']);
            Route::post('quote', [AppointmentController::class, 'quote']);
            Route::get('availability', [AppointmentController::class, 'availability']);
            Route::get('{id}', [AppointmentController::class, 'show']);
            Route::put('{id}', [AppointmentController::class, 'update']);
            Route::delete('{id}', [AppointmentController::class, 'destroy']);
            Route::post('{id}/reschedule', [AppointmentController::class, 'reschedule']);
            Route::post('{id}/cancel', [AppointmentController::class, 'cancel']);
            Route::post('{id}/complete', [AppointmentController::class, 'complete']);
        });

        // Review Routes
        Route::prefix('reviews')->group(function () {
            Route::get('/', [ReviewController::class, 'index']);
            Route::post('/', [ReviewController::class, 'store']);
            Route::get('{id}', [ReviewController::class, 'show']);
            Route::put('{id}', [ReviewController::class, 'update']);
            Route::delete('{id}', [ReviewController::class, 'destroy']);
        });

        // Loyalty Routes
        Route::prefix('loyalty')->group(function () {
            Route::get('/', [LoyaltyController::class, 'index']);
            Route::post('/', [LoyaltyController::class, 'store']);
            Route::get('{id}', [LoyaltyController::class, 'show']);
            Route::put('{id}', [LoyaltyController::class, 'update']);
            Route::delete('{id}', [LoyaltyController::class, 'destroy']);
        });

        // Campaign Routes
        Route::prefix('campaigns')->group(function () {
            Route::get('/', [CampaignController::class, 'index']);
            Route::post('/', [CampaignController::class, 'store']);
            Route::get('{id}', [CampaignController::class, 'show']);
            Route::put('{id}', [CampaignController::class, 'update']);
            Route::delete('{id}', [CampaignController::class, 'destroy']);
        });

        // Payment Routes
        Route::prefix('payments')->group(function () {
            Route::get('/', [PaymentController::class, 'index']);
            Route::get('stats', [PaymentController::class, 'stats']);
        });

        // Subscription Routes
        Route::prefix('subscriptions')->group(function () {
            Route::get('my', [SubscriptionController::class, 'mySubscription']);
            Route::post('/', [SubscriptionController::class, 'subscribe']);
            Route::post('{id}/cancel', [SubscriptionController::class, 'cancel']);
            Route::get('usage', [SubscriptionController::class, 'usageHistory']);
        });

        // Dashboard Routes
        Route::prefix('dashboard')->group(function () {
            Route::get('superadmin', [DashboardController::class, 'superadmin'])->middleware('role:SUPERADMIN');
            Route::get('business', [DashboardController::class, 'business']);
            Route::get('bi/pdf', [\App\Http\Controllers\Api\ReportController::class, 'downloadBIPDF']);
        });

        // Chat Routes
        Route::prefix('chat')->group(function () {
            Route::get('conversations', [ChatController::class, 'index']);
            Route::post('conversations', [ChatController::class, 'store']);
            Route::get('conversations/{id}', [ChatController::class, 'show']);
            Route::post('conversations/{id}/messages', [ChatController::class, 'sendMessage']);
            Route::get('unread', [ChatController::class, 'unreadCount']);
        });

        // On-Demand Routes
        Route::prefix('on-demand')->group(function () {
            Route::get('analytics', [OnDemandController::class, 'analytics']);
            Route::get('presence', [OnDemandController::class, 'presence']);
            Route::put('presence', [OnDemandController::class, 'presence']);
            Route::post('{id}/reject', [OnDemandController::class, 'reject']);
            Route::post('{id}/reassign', [OnDemandController::class, 'reassign']);
            Route::post('{id}/price-quote', [OnDemandController::class, 'proposeQuote']);
            Route::post('{id}/price-quote/accept', [OnDemandController::class, 'acceptQuote']);
            Route::get('/', [OnDemandController::class, 'index']);
            Route::post('/request', [OnDemandController::class, 'store']);
            Route::get('nearby-professionals', [OnDemandController::class, 'nearbyProfessionals']);
            Route::get('{id}', [OnDemandController::class, 'show']);
            Route::post('{id}/accept', [OnDemandController::class, 'accept']);
            Route::post('{id}/update-status', [OnDemandController::class, 'updateStatus']);
            Route::post('{id}/cancel', [OnDemandController::class, 'cancel']);
        });

        // Wallet Routes
        Route::prefix('wallet')->group(function () {
            Route::get('/', [WalletController::class, 'index']);
            Route::post('topup', [WalletController::class, 'topUp']);
            Route::post('pay', [WalletController::class, 'pay']);
            Route::get('transactions', [WalletController::class, 'transactions']);
        });

        // MercadoPago Routes
        Route::prefix('wompi')->group(function () {
            Route::get('config', [WompiController::class, 'config']);
            Route::get('orders', [WompiController::class, 'history']);
            Route::get('orders/{id}', [WompiController::class, 'show'])->whereUuid('id');
            Route::post('wallet', [WompiController::class, 'wallet'])->middleware('throttle:20,1');
            Route::post('membership', [WompiController::class, 'membership'])->middleware('throttle:20,1');
        });

        Route::prefix('mercadopago')->group(function () {
            Route::get('public-key', [MercadoPagoController::class, 'publicKey']);
            Route::post('wallet-preference', [MercadoPagoController::class, 'createWalletPreference']);
            Route::post('appointment-preference', [MercadoPagoController::class, 'createAppointmentPreference']);
        });

        // Professional Earnings
        Route::prefix('earnings')->group(function () {
            Route::get('dashboard', [EarningsController::class, 'dashboard']);
            Route::post('withdrawal', [EarningsController::class, 'requestWithdrawal']);
        });

        // Waitlist Routes
        Route::prefix('waitlist')->group(function () {
            Route::get('/', [WaitlistController::class, 'myWaitlist']);
            Route::post('/', [WaitlistController::class, 'store']);
            Route::post('{id}/cancel', [WaitlistController::class, 'cancel']);
            Route::get('business', [WaitlistController::class, 'businessIndex']);
        });

        // AI Chatbot Routes
        Route::prefix('ai-chat')->middleware('throttle:20,1')->group(function () {
            Route::post('start', [AIChatbotController::class, 'start']);
            Route::get('history', [AIChatbotController::class, 'history']);
            Route::get('{sessionId}', [AIChatbotController::class, 'show']);
            Route::delete('{sessionId}', [AIChatbotController::class, 'destroy']);
            Route::post('{sessionId}/send', [AIChatbotController::class, 'send']);
            Route::post('{sessionId}/close', [AIChatbotController::class, 'close']);
        });

        // Google Calendar Sync Routes
        Route::prefix('google-calendar')->group(function () {
            Route::get('auth-url', [GoogleCalendarController::class, 'getAuthUrl']);
            Route::get('status', [GoogleCalendarController::class, 'status']);
            Route::post('disconnect', [GoogleCalendarController::class, 'disconnect']);
            Route::post('sync', [GoogleCalendarController::class, 'triggerSync']);
            Route::post('sync-busy', [GoogleCalendarController::class, 'syncBusy']);
        });

        // Gamification Routes
        Route::prefix('gamification')->group(function () {
            Route::get('stats', [GamificationController::class, 'stats']);
            Route::get('leaderboard', [GamificationController::class, 'leaderboard']);
            Route::get('badges', [GamificationController::class, 'badges']);
        });

        // Dynamic Pricing Routes (admin write only)
        Route::prefix('dynamic-pricing')->group(function () {
            Route::get('context', [DynamicPricingController::class, 'context']);
            Route::get('rules', [DynamicPricingController::class, 'index']);
            Route::post('calculate', [DynamicPricingController::class, 'calculate']);
            Route::put('rules/{id}', [DynamicPricingController::class, 'update']);
            Route::post('rules', [DynamicPricingController::class, 'store']);
            Route::delete('rules/{id}', [DynamicPricingController::class, 'destroy']);
        });

        // BNPL Routes
        Route::prefix('bnpl')->group(function () {
            Route::post('apply', [BNPLController::class, 'store']);
            Route::post('{id}/approve', [BNPLController::class, 'approve']);
            Route::post('{id}/reject', [BNPLController::class, 'reject']);
            Route::post('installments/{id}/pay', [BNPLController::class, 'payInstallment']);
            Route::get('my', [BNPLController::class, 'byClient']);
            Route::get('appointment/{appointmentId}', [BNPLController::class, 'byAppointment']);
        });

        // Split Payment Routes
        Route::prefix('split-payments')->group(function () {
            Route::post('/', [SplitPaymentController::class, 'store']);
            Route::post('participants/{id}/pay', [SplitPaymentController::class, 'markPaid']);
            Route::get('my', [SplitPaymentController::class, 'mySplits']);
            Route::get('appointment/{appointmentId}', [SplitPaymentController::class, 'byAppointment']);
        });

        // Smart Queue Routes (write/admin only — public read moved outside)
        Route::prefix('smart-queues')->group(function () {
            Route::post('/', [SmartQueueController::class, 'store']);
            Route::post('{queueId}/join', [SmartQueueController::class, 'join']);
            Route::post('{queueId}/call-next', [SmartQueueController::class, 'callNext']);
            Route::post('entries/{entryId}/start', [SmartQueueController::class, 'startServing']);
            Route::post('entries/{entryId}/complete', [SmartQueueController::class, 'complete']);
            Route::post('entries/{entryId}/cancel', [SmartQueueController::class, 'cancel']);
            Route::post('{queueId}/displays', [SmartQueueController::class, 'createDisplay']);
        });

        // Membership Routes (write/admin only — public read moved outside)
        Route::prefix('memberships')->group(function () {
            Route::post('plans', [MembershipController::class, 'storePlan']);
            Route::put('plans/{id}', [MembershipController::class, 'updatePlan']);
            Route::post('subscribe', [MembershipController::class, 'subscribe']);
            Route::get('my', [MembershipController::class, 'myMemberships']);
            Route::post('{id}/cancel', [MembershipController::class, 'cancel']);
        });

        // Webhooks
        Route::prefix('webhooks')->group(function () {
            Route::get('/', [WebhookController::class, 'index']);
            Route::post('/', [WebhookController::class, 'store']);
            Route::put('{id}', [WebhookController::class, 'update']);
            Route::delete('{id}', [WebhookController::class, 'destroy']);
            Route::get('{id}/deliveries', [WebhookController::class, 'deliveries']);
            Route::post('deliveries/{id}/replay', [WebhookController::class, 'replay'])->whereNumber('id')->middleware('throttle:6,1');
        });

    }); // End auth:sanctum group

    // Public MercadoPago Webhook (must be outside auth)
    Route::post('webhooks/wompi', [WompiController::class, 'webhook'])->middleware('throttle:120,1');
    Route::post('webhooks/mercadopago', [MercadoPagoController::class, 'webhook']);

    // WhatsApp Webhook (must be outside auth)
    Route::get('webhooks/whatsapp', [WhatsAppWebhookController::class, 'verify']);
    Route::post('webhooks/whatsapp', [WhatsAppWebhookController::class, 'handle']);

    // Google Calendar Webhook (public)
    Route::post('webhooks/google-calendar', [GoogleCalendarController::class, 'incomingWebhook']);
    Route::get('google-calendar/callback', [GoogleCalendarController::class, 'handleCallback']);
});
