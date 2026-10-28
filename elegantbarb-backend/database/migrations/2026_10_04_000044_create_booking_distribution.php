<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('marketing.booking_distribution', function (Blueprint $table) {
            $table->foreignId('business_id')->primary()->constrained('business.businesses')->restrictOnDelete();
            $table->jsonb('allowed_origins')->default('[]');
            $table->boolean('enabled')->default(false);
            $table->string('theme', 10)->default('light');
            $table->string('locale', 2)->default('es');
            $table->timestampsTz();
        });
        Schema::create('marketing.booking_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('business_id')->constrained('business.businesses')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('public.users')->restrictOnDelete();
            $table->string('label', 100);
            $table->jsonb('selection');
            $table->boolean('active')->default(true);
            $table->unsignedBigInteger('opens_count')->default(0);
            $table->timestampTz('last_opened_at')->nullable();
            $table->timestampsTz();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('marketing.booking_links');
        Schema::dropIfExists('marketing.booking_distribution');
    }
};
