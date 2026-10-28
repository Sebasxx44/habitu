<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty.loyalty_programs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->foreignId('professional_id')->nullable()->constrained('people.professionals')->onDelete('set null');
            $table->foreignId('service_id')->nullable()->constrained('catalog.services')->onDelete('set null');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('type', 50)->default('STAMP'); // STAMP, POINTS, TIER
            $table->integer('stamps_required')->default(5);
            $table->string('reward_description');
            $table->boolean('active')->default(true);
            $table->date('valid_until')->nullable();
            $table->timestamps();

            $table->index('business_id');
        });

        Schema::create('loyalty.loyalty_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loyalty_program_id')->constrained('loyalty.loyalty_programs')->onDelete('cascade');
            $table->foreignId('client_id')->constrained('people.clients')->onDelete('cascade');
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->integer('current_stamps')->default(0);
            $table->integer('total_stamps_ever')->default(0);
            $table->integer('rewards_redeemed')->default(0);
            $table->boolean('reward_available')->default(false);
            $table->string('status', 50)->default('ACTIVE'); // ACTIVE, COMPLETED, REDEEMED, SUSPENDED
            $table->timestamp('last_stamp_at')->nullable();
            $table->timestamps();

            $table->unique(['loyalty_program_id', 'client_id']);
            $table->index(['business_id', 'status']);
            $table->index('client_id');
        });

        Schema::create('loyalty.loyalty_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('people.clients')->onDelete('cascade');
            $table->integer('points');
            $table->string('type', 20); // EARN, REDEEM
            $table->foreignId('appointment_id')->nullable()->constrained('booking.appointments')->onDelete('set null');
            $table->foreignId('loyalty_card_id')->nullable()->constrained('loyalty.loyalty_cards')->onDelete('set null');
            $table->string('description');
            $table->timestamp('created_at');

            $table->index('client_id');
        });

        Schema::create('loyalty.client_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->string('name'); // Bronze, Silver, Gold, Diamond
            $table->integer('min_points');
            $table->integer('max_points')->nullable();
            $table->string('color', 20)->nullable();
            $table->string('icon', 100)->nullable();
            $table->jsonb('benefits')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty.client_levels');
        Schema::dropIfExists('loyalty.loyalty_transactions');
        Schema::dropIfExists('loyalty.loyalty_cards');
        Schema::dropIfExists('loyalty.loyalty_programs');
    }
};
