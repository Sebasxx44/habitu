<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing.promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->foreignId('business_category_id')->nullable()->constrained('platform.business_categories')->onDelete('set null');
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('discount', 10, 2);
            $table->string('type', 50); // PERCENTAGE, FIXED_AMOUNT, FREE_SERVICE, BOGO
            $table->decimal('min_purchase', 10, 2)->nullable();
            $table->decimal('max_discount', 10, 2)->nullable();
            $table->integer('per_user_limit')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('promo_code')->nullable();
            $table->text('image_url')->nullable();
            $table->integer('usage_limit')->nullable();
            $table->integer('usage_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('business_id');
            $table->index('promo_code');
        });

        Schema::create('marketing.promotion_service', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_id')->constrained('marketing.promotions')->onDelete('cascade');
            $table->foreignId('service_id')->constrained('catalog.services')->onDelete('cascade');
            $table->decimal('discount', 10, 2);
            $table->string('type', 50);
            $table->timestamps();
        });

        Schema::create('marketing.promotion_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_id')->constrained('marketing.promotions')->onDelete('cascade');
            $table->foreignId('client_id')->constrained('people.clients')->onDelete('cascade');
            $table->foreignId('appointment_id')->nullable()->constrained('booking.appointments')->onDelete('set null');
            $table->decimal('saved_amount', 10, 2);
            $table->timestamp('created_at');
        });

        Schema::create('marketing.campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id');
            $table->foreignId('business_id')->nullable()->constrained('business.businesses')->onDelete('cascade');
            $table->string('subject');
            $table->text('body');
            $table->string('type', 50)->default('CUSTOM'); // PROMO, NEWS, REMINDER, CUSTOM
            $table->string('status', 50)->default('DRAFT'); // DRAFT, SCHEDULED, SENDING, SENT, FAILED
            $table->string('target_role', 50)->nullable();
            $table->jsonb('target_ids')->nullable();
            $table->integer('recipients_count')->default(0);
            $table->integer('sent_count')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->text('error_log')->nullable();
            $table->timestamps();
        });

        Schema::create('marketing.campaign_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('marketing.campaigns')->onDelete('cascade');
            $table->string('recipient_email');
            $table->string('recipient_name')->nullable();
            $table->string('status', 50)->default('SENT'); // SENT, FAILED, OPENED, CLICKED
            $table->text('error_message')->nullable();
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('clicked_at')->nullable();
            $table->timestamps();
        });

        Schema::create('marketing.notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id');
            $table->string('title');
            $table->text('message');
            $table->string('type', 50)->default('GENERAL'); // GENERAL, APPOINTMENT, PROMOTION, PAYMENT, SYSTEM
            $table->jsonb('data')->nullable();
            $table->boolean('read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('read');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing.notifications');
        Schema::dropIfExists('marketing.campaign_logs');
        Schema::dropIfExists('marketing.campaigns');
        Schema::dropIfExists('marketing.promotion_redemptions');
        Schema::dropIfExists('marketing.promotion_service');
        Schema::dropIfExists('marketing.promotions');
    }
};
