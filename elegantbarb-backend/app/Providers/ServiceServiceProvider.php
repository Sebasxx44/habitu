<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Interfaces\Services\ClientServiceInterface;
use App\Services\ClientService;

class ServiceServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(ClientServiceInterface::class, ClientService::class);
        $this->app->bind(\App\Interfaces\Services\BarberServiceInterface::class, \App\Services\BarberService::class);
        $this->app->bind(\App\Interfaces\Services\AuthServiceInterface::class, \App\Services\AuthService::class);
        $this->app->bind(\App\Interfaces\Services\RoleServiceInterface::class, \App\Services\RoleService::class);
        $this->app->bind(\App\Interfaces\Services\PermissionServiceInterface::class, \App\Services\PermissionService::class);
        $this->app->bind(\App\Interfaces\Services\NotificationServiceInterface::class, \App\Services\NotificationService::class);
        $this->app->bind(\App\Interfaces\Services\ReportServiceInterface::class, \App\Services\ReportService::class);
        $this->app->bind(\App\Interfaces\Services\DashboardServiceInterface::class, \App\Services\DashboardService::class);
        $this->app->bind(\App\Interfaces\Services\ServiceServiceInterface::class, \App\Services\ServiceService::class);
        $this->app->bind(\App\Interfaces\Services\PaymentServiceInterface::class, \App\Services\PaymentService::class);
        $this->app->bind(\App\Interfaces\Services\AppointmentServiceInterface::class, \App\Services\AppointmentService::class);
        $this->app->bind(\App\Interfaces\Services\BarberShopServiceInterface::class, \App\Services\BarberShopService::class);
    }
}
