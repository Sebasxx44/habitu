<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform.operational_heartbeats', function (Blueprint $table) {
            $table->string('name', 50)->primary();
            $table->string('status', 20);
            $table->timestampTz('last_seen_at');
            $table->timestampTz('last_started_at')->nullable();
            $table->timestampTz('last_succeeded_at')->nullable();
            $table->timestampTz('last_failed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform.operational_heartbeats');
    }
};
