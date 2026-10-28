<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check');
        DB::statement('ALTER TABLE public.users ALTER COLUMN role TYPE VARCHAR(50)');
        DB::table('public.users')
            ->whereIn('role', ['PROFESIONAL', 'BARBERO'])
            ->update(['role' => 'PROFESSIONAL']);
        DB::statement("ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('SUPERADMIN', 'ADMIN_BARBERIA', 'PROFESSIONAL', 'CLIENTE'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check');
        DB::table('public.users')
            ->where('role', 'PROFESSIONAL')
            ->update(['role' => 'PROFESSIONAL']);
        DB::statement("ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('SUPERADMIN', 'ADMIN_BARBERIA', 'PROFESSIONAL', 'CLIENTE'))");
    }
};
