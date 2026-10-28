<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop old tables if they exist with different structure
        Schema::dropIfExists('licenses');
        Schema::dropIfExists('plans');

        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->decimal('monthly_price', 10, 2)->default(0);
            $table->decimal('annual_price', 10, 2)->default(0);
            $table->integer('max_barbers')->default(1);
            $table->integer('max_clients')->default(100);
            $table->integer('max_appointments_monthly')->default(500);
            $table->boolean('has_reports')->default(false);
            $table->boolean('has_campaigns')->default(false);
            $table->boolean('has_whatsapp')->default(false);
            $table->boolean('has_payments')->default(false);
            $table->boolean('has_loyalty')->default(false);
            $table->boolean('has_custom_domain')->default(false);
            $table->boolean('is_popular')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('trial_days')->default(14);
            $table->timestamps();
        });

        Schema::create('licenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('barber_shop_id')->constrained('barber_shops');
            $table->foreignId('plan_id')->constrained('plans');
            $table->string('status')->default('TRIAL'); // TRIAL, ACTIVE, PAST_DUE, EXPIRED, SUSPENDED, CANCELLED
            $table->string('billing_cycle')->default('monthly'); // monthly, annual
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('payment_method')->nullable();
            $table->string('transaction_id')->nullable();
            $table->decimal('amount_paid', 10, 2)->default(0);
            $table->integer('warnings_sent')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licenses');
        Schema::dropIfExists('plans');
    }
};