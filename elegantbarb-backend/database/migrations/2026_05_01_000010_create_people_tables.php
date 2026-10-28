<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('people.clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable();
            $table->foreignId('business_id')->nullable()->constrained('business.businesses')->onDelete('set null');
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->date('birthdate')->nullable();
            $table->text('notes')->nullable();
            $table->integer('loyalty_points')->default(0);
            $table->integer('xp_points')->default(0);
            $table->string('tier', 50)->default('BRONZE');
            $table->boolean('is_vip')->default(false);
            $table->foreignId('referred_by')->nullable()->constrained('people.clients')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            $table->index('business_id');
            $table->index('email');
            $table->index('user_id');
        });

        Schema::create('people.professional_availability', function (Blueprint $table) {
            $table->id();
            $table->foreignId('professional_id')->constrained('people.professionals')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('business.business_branches')->onDelete('cascade');
            $table->tinyInteger('day_of_week')->unsigned(); // 0=Sunday, 6=Saturday
            $table->time('start_time');
            $table->time('end_time');
            $table->boolean('is_available')->default(true);
            $table->timestamps();

            $table->unique(['professional_id', 'branch_id', 'day_of_week']);
        });

        Schema::create('people.professional_portfolios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('professional_id')->constrained('people.professionals')->onDelete('cascade');
            $table->text('image_url');
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('people.favorite_professionals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('people.clients')->onDelete('cascade');
            $table->foreignId('professional_id')->constrained('people.professionals')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['client_id', 'professional_id']);
        });

        Schema::create('people.favorite_businesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('people.clients')->onDelete('cascade');
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['client_id', 'business_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('people.favorite_businesses');
        Schema::dropIfExists('people.favorite_professionals');
        Schema::dropIfExists('people.professional_portfolios');
        Schema::dropIfExists('people.professional_availability');
        Schema::dropIfExists('people.clients');
    }
};
