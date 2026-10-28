<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FreshMigrateSchemas extends Command
{
    protected $signature = 'migrate:fresh:schemas {--seed : Seed the database}';
    protected $description = 'Drop all PostgreSQL schemas and run fresh migrations';

    public function handle(): int
    {
        $schemas = [
            'auth', 'platform', 'business', 'catalog', 'people',
            'booking', 'finance', 'marketing', 'loyalty', 'reviews',
            'on_demand', 'chat', 'tracking', 'subscriptions',
        ];

        $this->info('Dropping all custom schemas...');
        foreach ($schemas as $schema) {
            DB::statement("DROP SCHEMA IF EXISTS {$schema} CASCADE");
            $this->info("  Dropped schema: {$schema}");
        }

        // Ensure public schema exists and is clean
        DB::statement('DROP SCHEMA IF EXISTS public CASCADE');
        DB::statement('CREATE SCHEMA public');
        DB::statement('GRANT ALL ON SCHEMA public TO postgres');
        DB::statement('GRANT ALL ON SCHEMA public TO public');

        // Drop and recreate public schema
        DB::statement('DROP SCHEMA IF EXISTS public CASCADE');
        DB::statement('CREATE SCHEMA public');
        DB::statement('GRANT ALL ON SCHEMA public TO postgres');
        DB::statement('GRANT ALL ON SCHEMA public TO public');

        $this->info('Running migrations...');
        $this->call('migrate', ['--force' => true]);

        if ($this->option('seed')) {
            $this->info('Seeding database...');
            $this->call('db:seed', ['--force' => true]);
        }

        return self::SUCCESS;
    }
}
