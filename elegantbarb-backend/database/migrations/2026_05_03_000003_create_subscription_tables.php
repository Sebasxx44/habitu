<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions.plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('billing_cycle', 20)->default('MONTHLY');
            $table->decimal('price', 12, 2);
            $table->string('currency', 3)->default('COP');
            $table->integer('credits_per_cycle')->default(0);
            $table->integer('max_appointments_per_cycle')->nullable();
            $table->integer('max_on_demand_per_cycle')->nullable();
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->json('included_services')->nullable();
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'sort_order']);
        });

        Schema::create('subscriptions.user_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->foreignId('plan_id')->constrained('subscriptions.plans')->onDelete('cascade');
            $table->string('status', 30)->default('ACTIVE');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancellation_reason')->nullable();
            $table->boolean('auto_renew')->default(true);
            $table->integer('credits_remaining')->default(0);
            $table->integer('appointments_used')->default(0);
            $table->integer('on_demand_used')->default(0);
            $table->string('payment_method', 30)->nullable();
            $table->string('external_subscription_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index(['status', 'ends_at']);
        });

        Schema::create('subscriptions.subscription_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_subscription_id')->constrained('subscriptions.user_subscriptions')->onDelete('cascade');
            $table->string('usage_type', 30);
            $table->foreignId('source_id')->nullable();
            $table->string('source_type', 50)->nullable();
            $table->integer('credits_used')->default(0);
            $table->decimal('discount_applied', 12, 2)->default(0);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['user_subscription_id', 'usage_type']);
            $table->index(['source_type', 'source_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions.subscription_usages');
        Schema::dropIfExists('subscriptions.user_subscriptions');
        Schema::dropIfExists('subscriptions.plans');
    }
};
