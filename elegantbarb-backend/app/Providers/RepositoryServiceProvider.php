<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Interfaces\Repositories\ClientRepositoryInterface;
use App\Repositories\ClientRepository;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(ClientRepositoryInterface::class, ClientRepository::class);
        $this->app->bind(\App\Interfaces\Repositories\BarberRepositoryInterface::class, \App\Repositories\BarberRepository::class);
        $this->app->bind(\App\Interfaces\Repositories\UserRepositoryInterface::class, \App\Repositories\UserRepository::class);
        $this->app->bind(\App\Interfaces\Repositories\RoleRepositoryInterface::class, \App\Repositories\RoleRepository::class);
        $this->app->bind(\App\Interfaces\Repositories\PermissionRepositoryInterface::class, \App\Repositories\PermissionRepository::class);
        $this->app->bind(\App\Interfaces\Repositories\NotificationRepositoryInterface::class, \App\Repositories\NotificationRepository::class);
        $this->app->bind(\App\Interfaces\Repositories\ReportRepositoryInterface::class, \App\Repositories\ReportRepository::class);
        $this->app->bind(\App\Interfaces\Repositories\DashboardRepositoryInterface::class, \App\Repositories\DashboardRepository::class);
        $this->app->bind(\App\Interfaces\Repositories\ServiceRepositoryInterface::class, \App\Repositories\ServiceRepository::class);
        $this->app->bind(\App\Interfaces\Repositories\AppointmentRepositoryInterface::class, \App\Repositories\AppointmentRepository::class);
        $this->app->bind(\App\Interfaces\Repositories\BarberShopRepositoryInterface::class, \App\Repositories\BarberShopRepository::class);
        $this->app->bind(\App\Repositories\Interfaces\CampaignRepositoryInterface::class, \App\Repositories\Eloquent\EloquentCampaignRepository::class);
    }
}
