<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class ModuleServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Business Module
        $this->app->bind(
            \App\Modules\Business\Repositories\BusinessRepository::class,
            fn ($app) => new \App\Modules\Business\Repositories\BusinessRepository(
                new \App\Modules\Business\Models\Business()
            )
        );
        $this->app->bind(
            \App\Modules\Business\Services\BusinessService::class,
            fn ($app) => new \App\Modules\Business\Services\BusinessService(
                $app->make(\App\Modules\Business\Repositories\BusinessRepository::class)
            )
        );

        // People Module
        $this->app->bind(
            \App\Modules\People\Repositories\ProfessionalRepository::class,
            fn ($app) => new \App\Modules\People\Repositories\ProfessionalRepository(
                new \App\Modules\People\Models\Professional()
            )
        );
        $this->app->bind(
            \App\Modules\People\Services\ProfessionalService::class,
            fn ($app) => new \App\Modules\People\Services\ProfessionalService(
                $app->make(\App\Modules\People\Repositories\ProfessionalRepository::class),
                $app->make(\App\Modules\People\DTOs\ProfessionalProfile::class),
                $app->make(\App\Services\BusinessAccessService::class)
            )
        );

        // Booking Module
        $this->app->bind(
            \App\Modules\Booking\Repositories\AppointmentRepository::class,
            fn ($app) => new \App\Modules\Booking\Repositories\AppointmentRepository(
                new \App\Modules\Booking\Models\Appointment()
            )
        );
        $this->app->bind(
            \App\Modules\Booking\Services\AppointmentService::class,
            fn ($app) => new \App\Modules\Booking\Services\AppointmentService(
                $app->make(\App\Modules\Booking\Repositories\AppointmentRepository::class)
            )
        );
    }

    public function boot(): void
    {
        //
    }
}
