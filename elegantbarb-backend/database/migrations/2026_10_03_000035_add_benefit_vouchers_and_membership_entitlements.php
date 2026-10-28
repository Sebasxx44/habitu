<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions.client_memberships', function (Blueprint $table): void {
            $table->string('payment_reference', 120)->nullable()->unique();
            $table->jsonb('plan_snapshot')->nullable();
        });
        DB::statement("UPDATE subscriptions.client_memberships AS m SET plan_snapshot = jsonb_build_object('plan_id', p.id, 'business_id', p.business_id, 'name', p.name, 'price', p.price, 'currency', p.currency, 'billing_cycle', p.billing_cycle, 'appointments_included', p.appointments_included, 'included_services', p.included_services, 'discount_percentage', p.discount_percentage, 'benefits', p.benefits) FROM subscriptions.membership_plans AS p WHERE p.id = m.membership_plan_id AND m.plan_snapshot IS NULL");
        Schema::table('subscriptions.membership_usage', function (Blueprint $table): void {
            $table->timestamp('restored_at')->nullable();
            $table->index(['appointment_id', 'client_membership_id'], 'membership_usage_reservation_lookup');
        });
        Schema::create('loyalty.reward_vouchers', function (Blueprint $table): void {
            $table->id();
            $table->uuid('code')->unique();
            $table->foreignId('client_id')->constrained('people.clients');
            $table->foreignId('business_id')->constrained('business.businesses');
            $table->foreignId('loyalty_card_id')->constrained('loyalty.loyalty_cards');
            $table->foreignId('transaction_id')->unique()->constrained('loyalty.loyalty_transactions');
            $table->string('reward');
            $table->string('status', 20)->default('AVAILABLE');
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->foreignId('used_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->index(['client_id', 'status']);
            $table->index(['business_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty.reward_vouchers');
        Schema::table('subscriptions.membership_usage', function (Blueprint $table): void {
            $table->dropIndex('membership_usage_reservation_lookup');
            $table->dropColumn('restored_at');
        });
        Schema::table('subscriptions.client_memberships', function (Blueprint $table): void {
            $table->dropColumn(['payment_reference', 'plan_snapshot']);
        });
    }
};
