<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing.referral_codes', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained('public.users');
            $table->string('code', 30)->unique();
            $table->timestampsTz();
        });
        Schema::create('marketing.referral_programs', function (Blueprint $table) {
            $table->foreignId('business_id')->primary()->constrained('business.businesses');
            $table->boolean('enabled')->default(false);
            $table->unsignedBigInteger('reward_minor')->default(0);
            $table->unsignedBigInteger('minimum_paid_minor')->default(0);
            $table->string('currency', 3);
            $table->unsignedSmallInteger('validity_days')->default(30);
            $table->unsignedSmallInteger('qualification_days')->default(30);
            $table->text('terms');
            $table->timestampsTz();
        });
        Schema::create('marketing.referral_attributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referrer_id')->constrained('public.users');
            $table->foreignId('referred_id')->unique()->constrained('public.users');
            $table->foreignId('appointment_id')->nullable()->constrained('booking.appointments');
            $table->string('status', 20)->default('ATTRIBUTED');
            $table->timestampTz('qualified_at')->nullable();
            $table->timestampTz('reversed_at')->nullable();
            $table->timestampsTz();
        });
        Schema::create('marketing.referral_rewards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attribution_id')->constrained('marketing.referral_attributions');
            $table->foreignId('user_id')->constrained('public.users');
            $table->foreignId('promotion_id')->unique()->constrained('marketing.promotions');
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3);
            $table->string('status', 20)->default('ISSUED');
            $table->jsonb('terms_snapshot');
            $table->timestampsTz();
            $table->unique(['attribution_id', 'user_id']);
        });
        Schema::create('marketing.contact_preferences', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained('public.users');
            $table->boolean('promotions_enabled')->default(false);
            $table->string('timezone', 100)->default('America/Bogota');
            $table->time('contact_start')->default('09:00');
            $table->time('contact_end')->default('20:00');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        foreach (['marketing.contact_preferences', 'marketing.referral_rewards', 'marketing.referral_attributions', 'marketing.referral_programs', 'marketing.referral_codes'] as $table) Schema::dropIfExists($table);
    }
};
