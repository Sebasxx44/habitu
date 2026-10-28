<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        \App\Modules\Business\Models\Business::class => \App\Modules\Business\Policies\BusinessPolicy::class,
        \App\Modules\People\Models\Professional::class => \App\Modules\People\Policies\ProfessionalPolicy::class,
        \App\Modules\Booking\Models\Appointment::class => \App\Modules\Booking\Policies\AppointmentPolicy::class,
    ];

    public function boot(): void
    {
        //
    }
}
