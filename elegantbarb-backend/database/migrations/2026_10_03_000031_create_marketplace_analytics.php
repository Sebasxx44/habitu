<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform.analytics_preferences', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained('public.users')->cascadeOnDelete();
            $table->boolean('measurement')->default(false);
            $table->boolean('personalization')->default(false);
            $table->timestamps();
        });
        Schema::create('platform.marketplace_events', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('event_id')->unique();
            $table->uuid('session_id');
            $table->char('actor_hash', 64);
            $table->string('event', 40);
            $table->string('source', 20);
            $table->foreignId('business_id')->nullable()->constrained('business.businesses')->nullOnDelete();
            $table->foreignId('service_id')->nullable()->constrained('catalog.services')->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('platform.business_categories')->nullOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained('booking.appointments')->nullOnDelete();
            $table->uuid('conversation_id')->nullable();
            $table->unsignedInteger('results_count')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['business_id', 'created_at', 'event']);
            $table->index(['created_at', 'event']);
            $table->index(['actor_hash', 'session_id', 'created_at']);
        });
        DB::statement("CREATE UNIQUE INDEX marketplace_booking_event_once ON platform.marketplace_events (appointment_id) WHERE event = 'booking_confirmed' AND appointment_id IS NOT NULL");
    }

    public function down(): void
    {
        Schema::dropIfExists('platform.marketplace_events');
        Schema::dropIfExists('platform.analytics_preferences');
    }
};
