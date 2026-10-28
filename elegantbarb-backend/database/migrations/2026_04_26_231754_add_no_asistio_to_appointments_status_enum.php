<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // For Postgres, we need to drop the existing check constraint and add a new one
        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE appointments DROP CONSTRAINT appointments_status_check');
            DB::statement("ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO'))");
        } else {
            // For MySQL or others
            DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO') DEFAULT 'PENDIENTE'");
        }
    }

    public function down(): void
    {
        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE appointments DROP CONSTRAINT appointments_status_check');
            DB::statement("ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'))");
        } else {
            DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA') DEFAULT 'PENDIENTE'");
        }
    }
};
