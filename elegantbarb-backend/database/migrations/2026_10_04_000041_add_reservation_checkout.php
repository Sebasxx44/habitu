<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('booking.appointments', function (Blueprint $table) {
            $table->timestampTz('hold_expires_at')->nullable()->index();
            $table->jsonb('checkout_snapshot')->nullable();
        });
        Schema::create('finance.booking_payment_policies', function (Blueprint $table) {
            $table->foreignId('business_id')->primary()->constrained('business.businesses')->restrictOnDelete();
            $table->jsonb('allowed_modes');
            $table->unsignedSmallInteger('deposit_percentage')->nullable();
            $table->unsignedSmallInteger('hold_minutes')->default(15);
            $table->text('cancellation_terms');
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('updated_by')->constrained('public.users')->restrictOnDelete();
            $table->timestampsTz();
        });
        Schema::create('finance.checkout_refunds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('checkout_order_id')->references('id')->on('finance.checkout_orders')->restrictOnDelete();
            $table->uuid('idempotency_key');
            $table->bigInteger('amount_in_cents');
            $table->string('currency', 3);
            $table->string('status', 20)->default('REQUESTED');
            $table->string('reason', 1000);
            $table->string('provider_reference', 150)->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampsTz();
            $table->unique(['checkout_order_id', 'idempotency_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance.checkout_refunds');
        Schema::dropIfExists('finance.booking_payment_policies');
        Schema::table('booking.appointments', fn (Blueprint $table) => $table->dropColumn(['hold_expires_at', 'checkout_snapshot']));
    }
};
