<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('catalog.service_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->restrictOnDelete();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->jsonb('service_ids');
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
        });
        Schema::create('booking.package_proposals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('public.users')->restrictOnDelete();
            $table->foreignId('package_id')->constrained('catalog.service_packages')->restrictOnDelete();
            $table->uuid('idempotency_key')->nullable();
            $table->string('status', 20)->default('PREVIEW');
            $table->jsonb('snapshot');
            $table->jsonb('appointment_ids')->nullable();
            $table->timestampTz('expires_at');
            $table->timestampsTz();
            $table->unique(['user_id', 'idempotency_key']);
        });
        Schema::create('loyalty.service_gifts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('code')->unique();
            $table->uuid('idempotency_key');
            $table->foreignId('business_id')->constrained('business.businesses')->restrictOnDelete();
            $table->foreignId('service_id')->constrained('catalog.services')->restrictOnDelete();
            $table->foreignId('issued_by')->constrained('public.users')->restrictOnDelete();
            $table->foreignId('recipient_user_id')->nullable()->constrained('public.users')->restrictOnDelete();
            $table->string('status', 20)->default('AVAILABLE');
            $table->jsonb('snapshot');
            $table->timestampTz('expires_at');
            $table->foreignId('appointment_id')->nullable()->unique()->constrained('booking.appointments')->restrictOnDelete();
            $table->foreignId('redeemed_by')->nullable()->constrained('public.users')->restrictOnDelete();
            $table->timestampTz('redeemed_at')->nullable();
            $table->timestampsTz();
            $table->unique(['business_id', 'idempotency_key']);
        });
        Schema::create('loyalty.service_gift_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('gift_id')->references('id')->on('loyalty.service_gifts')->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('public.users')->restrictOnDelete();
            $table->string('type', 30);
            $table->jsonb('details')->nullable();
            $table->timestampTz('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty.service_gift_events');
        Schema::dropIfExists('loyalty.service_gifts');
        Schema::dropIfExists('booking.package_proposals');
        Schema::dropIfExists('catalog.service_packages');
    }
};
