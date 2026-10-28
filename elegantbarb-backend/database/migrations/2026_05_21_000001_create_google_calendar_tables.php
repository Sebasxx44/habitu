<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform.google_calendar_tokens', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('professional_id')->unique();
            $table->text('access_token');
            $table->text('refresh_token')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->index('professional_id');
        });

        Schema::create('platform.google_calendar_events', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('professional_id');
            $table->unsignedBigInteger('appointment_id');
            $table->string('google_event_id');
            $table->timestamps();
            $table->index(['professional_id', 'appointment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform.google_calendar_events');
        Schema::dropIfExists('platform.google_calendar_tokens');
    }
};
