<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $schemas = [
            'auth',
            'platform',
            'business',
            'catalog',
            'people',
            'booking',
            'finance',
            'marketing',
            'loyalty',
            'reviews',
            'on_demand',
            'chat',
            'tracking',
            'subscriptions',
        ];

        if (app()->environment('testing')) {
            foreach (array_reverse($schemas) as $schema) {
                DB::statement("DROP SCHEMA IF EXISTS {$schema} CASCADE");
            }
        }

        foreach ($schemas as $schema) {
            DB::statement("CREATE SCHEMA IF NOT EXISTS {$schema}");
        }
    }

    public function down(): void
    {
        $schemas = [
            'subscriptions',
            'tracking',
            'chat',
            'on_demand',
            'reviews',
            'loyalty',
            'marketing',
            'finance',
            'booking',
            'people',
            'catalog',
            'business',
            'platform',
            'auth',
        ];

        foreach ($schemas as $schema) {
            DB::statement("DROP SCHEMA IF EXISTS {$schema} CASCADE");
        }
    }
};
