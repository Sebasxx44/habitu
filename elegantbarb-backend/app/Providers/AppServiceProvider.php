<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Modules\Realtime\Services\ResourceChangePublisher::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        foreach (['eloquent.saved: *', 'eloquent.deleted: *', 'eloquent.restored: *'] as $event) {
            \Illuminate\Support\Facades\Event::listen($event, fn (string $name, array $data) => app(\App\Modules\Realtime\Services\ResourceChangePublisher::class)->capture($data[0]));
        }
        \Illuminate\Support\Facades\Event::listen(\Illuminate\Queue\Events\JobProcessing::class,
            fn () => app(\App\Modules\Analytics\Services\OperationalDiagnostics::class)->record('queue', 'RUNNING'));
        \Illuminate\Support\Facades\Event::listen(\Illuminate\Queue\Events\JobProcessed::class,
            fn () => app(\App\Modules\Analytics\Services\OperationalDiagnostics::class)->record('queue', 'SUCCEEDED'));
        \Illuminate\Support\Facades\Event::listen(\Illuminate\Queue\Events\JobFailed::class,
            fn () => app(\App\Modules\Analytics\Services\OperationalDiagnostics::class)->record('queue', 'FAILED'));
        \Illuminate\Http\Resources\Json\JsonResource::withoutWrapping();
    }
}
