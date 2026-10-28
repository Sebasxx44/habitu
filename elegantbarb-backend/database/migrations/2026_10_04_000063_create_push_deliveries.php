<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform.push_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained('platform.push_devices')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('public.users')->cascadeOnDelete();
            $table->string('event_id', 120);
            $table->string('state', 24)->default('PENDING');
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestampTz('locked_at')->nullable();
            $table->timestampTz('accepted_at')->nullable();
            $table->string('provider_message_id')->nullable();
            $table->timestampsTz();
            $table->unique(['device_id', 'event_id']);
            $table->index(['user_id', 'accepted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform.push_deliveries');
    }
};
