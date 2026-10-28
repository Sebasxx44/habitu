<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Client Membership Plans (offered by businesses)
        Schema::create('subscriptions.membership_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2);
            $table->string('currency', 3)->default('COP');
            $table->string('billing_cycle', 20)->default('MONTHLY'); // MONTHLY, QUARTERLY, YEARLY
            $table->integer('appointments_included')->default(0);
            $table->json('included_services')->nullable(); // [1, 2, 3] service IDs
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->json('benefits')->nullable(); // ["Prioridad de agendamiento", "10% descuento en productos"]
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['business_id', 'slug']);
            $table->index(['business_id', 'is_active']);
        });

        // Client Memberships (purchased by clients)
        Schema::create('subscriptions.client_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('people.clients')->onDelete('cascade');
            $table->foreignId('membership_plan_id')->constrained('subscriptions.membership_plans')->onDelete('cascade');
            $table->string('status', 20)->default('ACTIVE'); // ACTIVE, EXPIRED, CANCELLED
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->integer('appointments_used')->default(0);
            $table->integer('appointments_remaining')->default(0);
            $table->boolean('auto_renew')->default(false);
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->index(['client_id', 'status']);
        });

        // Membership usage log
        Schema::create('subscriptions.membership_usage', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_membership_id')->constrained('subscriptions.client_memberships')->onDelete('cascade');
            $table->foreignId('appointment_id')->nullable()->constrained('booking.appointments')->onDelete('set null');
            $table->string('usage_type', 30); // APPOINTMENT, PRODUCT, SERVICE
            $table->decimal('discount_applied', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions.membership_usage');
        Schema::dropIfExists('subscriptions.client_memberships');
        Schema::dropIfExists('subscriptions.membership_plans');
    }
};
