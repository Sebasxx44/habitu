<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('marketing.ads', function (Blueprint $table) {
            $table->string('moderation_status', 20)->default('PENDING');
            $table->text('moderation_reason')->nullable();
            $table->foreignId('moderated_by')->nullable()->constrained('public.users')->restrictOnDelete();
            $table->timestampTz('moderated_at')->nullable();
        });
        Schema::create('marketing.ad_deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('ad_id')->constrained('marketing.ads')->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('public.users')->nullOnDelete();
            $table->timestampTz('expires_at');
            $table->timestampTz('viewed_at')->nullable();
            $table->timestampTz('clicked_at')->nullable();
            $table->timestampsTz();
            $table->index(['user_id', 'clicked_at']);
        });
        Schema::create('marketing.ad_attributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ad_id')->constrained('marketing.ads')->restrictOnDelete();
            $table->uuid('delivery_id')->references('id')->on('marketing.ad_deliveries')->restrictOnDelete();
            $table->foreignId('appointment_id')->unique()->constrained('booking.appointments')->restrictOnDelete();
            $table->timestampTz('created_at');
        });
        Schema::create('marketing.ad_audit_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ad_id')->constrained('marketing.ads')->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('public.users')->restrictOnDelete();
            $table->string('action', 30);
            $table->string('reason', 1000)->nullable();
            $table->timestampTz('created_at');
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('marketing.ad_audit_events');
        Schema::dropIfExists('marketing.ad_attributions');
        Schema::dropIfExists('marketing.ad_deliveries');
        Schema::table('marketing.ads', fn (Blueprint $table) => $table->dropColumn(['moderation_status', 'moderation_reason', 'moderated_by', 'moderated_at']));
    }
};
