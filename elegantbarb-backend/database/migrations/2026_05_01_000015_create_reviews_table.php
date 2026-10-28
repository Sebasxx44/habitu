<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews.reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained('business.business_branches')->onDelete('set null');
            $table->foreignId('professional_id')->nullable()->constrained('people.professionals')->onDelete('set null');
            $table->foreignId('client_id')->constrained('people.clients')->onDelete('cascade');
            $table->foreignId('appointment_id')->nullable()->constrained('booking.appointments')->onDelete('set null');
            $table->tinyInteger('rating')->unsigned(); // 1-5
            $table->text('comment')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->text('business_response')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('business_id');
            $table->index('client_id');
            $table->index('professional_id');
            $table->index('rating');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews.reviews');
    }
};
