<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        $schedule->call(fn () => app(\App\Modules\Analytics\Services\OperationalDiagnostics::class)->record('scheduler'))->name('platform:scheduler-heartbeat')->everyMinute();
        $schedule->command('ondemand:auto-cancel')->everyMinute();
        $schedule->command('subscriptions:process-renewals')->dailyAt('00:00');
        $schedule->command('wallet:daily-settlement')->dailyAt('02:00');
        $schedule->command('platform:send-notifications')->everyFiveMinutes()->withoutOverlapping();
        $schedule->command('platform:generate-recommendations')->dailyAt('03:00');
        $schedule->call(fn () => app(\App\Modules\Platform\Services\ProviderReviewService::class)->prune())->name('provider-reviews:prune')->dailyAt('04:30')->withoutOverlapping();
        $schedule->call(fn () => app(\App\Modules\Platform\Services\AssistantPrivacyService::class)->prune())->name('assistant:prune')->dailyAt('04:15')->withoutOverlapping();
        $schedule->command('analytics:prune')->dailyAt('03:30')->withoutOverlapping();
        $schedule->call(fn () => app(\App\Modules\Analytics\Services\OperationalDiagnostics::class)->run('payments', fn () => app(\App\Modules\Finance\Services\WompiCheckoutService::class)->reconcilePending()))->name('payments:reconcile')->everyFiveMinutes()->withoutOverlapping();
        $schedule->call(fn () => app(\App\Modules\Analytics\Services\OperationalDiagnostics::class)->run('outbox', fn () => app(\App\Modules\Platform\Services\MarketplaceOutbox::class)->process()))->name('webhooks:deliver-outbox')->everyMinute()->withoutOverlapping();
        $schedule->call(fn () => app(\App\Modules\Marketing\Services\ReferralService::class)->process())->name('referrals:qualify')->hourly()->withoutOverlapping();
        $schedule->call(fn () => app(\App\Modules\Platform\Services\GoogleCalendarBusyService::class)->refreshConnected())->name('calendar:refresh-busy')->everyFifteenMinutes()->withoutOverlapping();
        $schedule->call(fn () => app(\App\Modules\Marketing\Services\RetentionRecipeService::class)->run())->name('retention:prepare-actions')->hourly()->withoutOverlapping();
        $schedule->command('waitlist:expire')->everyFifteenMinutes();
        $schedule->call(fn () => app(\App\Modules\Analytics\Services\OperationalDiagnostics::class)->run('checkout_expiry', fn () => app(\App\Modules\Finance\Services\ReservationCheckoutService::class)->expire()))->name('booking:expire-checkouts')->everyMinute()->withoutOverlapping();
        $schedule->call(fn () => app(\App\Modules\Chat\Services\ChatRetentionService::class)->prune())->name('chat:prune')->dailyAt('04:00')->withoutOverlapping();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
