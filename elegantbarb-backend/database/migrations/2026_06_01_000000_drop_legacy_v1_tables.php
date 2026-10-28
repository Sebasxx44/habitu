<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop all legacy V1 tables that have been replaced by V2 modular schemas.
        // Keep: users, notifications, roles, permissions, role_permissions,
        //        user_roles, user_configurations, loyalty_programs, loyalty_cards,
        //        loyalty_transactions (still used by legacy controllers).

        $legacyTables = [
            'appointments',
            'appointment_cancellations',
            'appointment_reschedules',
            'barber_payouts',
            'barber_portfolios',
            'barber_shop_payment_method',
            'barber_shops',
            'barbers',
            'campaign_logs',
            'campaigns',
            'cities',
            'clients',
            'countries',
            'expenses',
            'favorite_barbers',
            'favorite_shops',
            'hours',
            'licenses',
            'payment_methods',
            'plans',
            'products',
            'promotion_redemptions',
            'promotion_service',
            'promotions',
            'reviews',
            'services',
            'subscriptions',
        ];

        // Legacy data must be retained until an explicit, verified archival operation.
        // This migration intentionally performs no destructive DDL on existing data.

    }

    public function down(): void
    {
        // Cannot restore dropped tables
    }
};
