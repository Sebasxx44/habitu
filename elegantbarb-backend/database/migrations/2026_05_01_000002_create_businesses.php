<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business.businesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_category_id')->constrained('platform.business_categories')->onDelete('restrict');
            $table->unsignedBigInteger('owner_user_id');
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('website')->nullable();
            $table->string('tax_id')->nullable(); // NIT/RUT
            $table->text('logo_url')->nullable();
            $table->text('banner_url')->nullable();
            $table->string('primary_color', 20)->default('#10B981');
            $table->string('secondary_color', 20)->nullable();
            $table->string('accent_color', 20)->nullable();
            $table->boolean('verified')->default(false);
            $table->decimal('rating', 2, 1)->default(5.0);
            $table->integer('reviews_count')->default(0);
            $table->foreignId('license_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('business_category_id');
            $table->index('slug');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business.businesses');
    }
};
