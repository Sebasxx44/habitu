<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog.service_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('business_id');
        });

        Schema::create('catalog.services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->foreignId('service_category_id')->nullable()->constrained('catalog.service_categories')->onDelete('set null');
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->integer('duration_minutes');
            $table->integer('buffer_minutes')->default(0);
            $table->integer('min_participants')->default(1);
            $table->integer('max_participants')->default(1);
            $table->text('image_url')->nullable();
            $table->jsonb('media_gallery')->nullable();
            $table->boolean('requires_professional')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('business_id');
            $table->index('service_category_id');
            $table->index('is_active');
        });

        Schema::create('catalog.branch_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('business.business_branches')->onDelete('cascade');
            $table->foreignId('service_id')->constrained('catalog.services')->onDelete('cascade');
            $table->decimal('price_override', 10, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['branch_id', 'service_id']);
        });

        Schema::create('catalog.professional_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('professional_id')->constrained('people.professionals')->onDelete('cascade');
            $table->foreignId('service_id')->constrained('catalog.services')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('business.business_branches')->onDelete('cascade');
            $table->decimal('commission_percentage', 5, 2)->nullable();
            $table->integer('duration_override')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['professional_id', 'service_id', 'branch_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog.professional_services');
        Schema::dropIfExists('catalog.branch_services');
        Schema::dropIfExists('catalog.services');
        Schema::dropIfExists('catalog.service_categories');
    }
};
