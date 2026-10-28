<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing.retention_recipes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses');
            $table->string('kind', 40);
            $table->boolean('enabled')->default(false);
            $table->unsignedSmallInteger('inactive_days')->default(30);
            $table->unsignedSmallInteger('lead_days')->default(7);
            $table->unsignedSmallInteger('frequency_days')->default(30);
            $table->unsignedSmallInteger('minimum_discount')->default(5);
            $table->unsignedSmallInteger('maximum_discount')->default(15);
            $table->timestampsTz();
            $table->unique(['business_id', 'kind']);
        });
        Schema::create('marketing.retention_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recipe_id')->constrained('marketing.retention_recipes');
            $table->string('dedupe_key')->unique();
            $table->foreignId('user_id')->nullable()->constrained('public.users');
            $table->string('state', 30)->default('PROPOSED');
            $table->jsonb('payload');
            $table->foreignId('notification_id')->nullable()->constrained('marketing.notifications');
            $table->foreignId('promotion_id')->nullable()->constrained('marketing.promotions');
            $table->foreignId('approved_by')->nullable()->constrained('public.users');
            $table->timestampTz('approved_at')->nullable();
            $table->timestampTz('expires_at');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing.retention_actions');
        Schema::dropIfExists('marketing.retention_recipes');
    }
};
