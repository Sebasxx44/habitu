<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business.branch_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('business.business_branches')->onDelete('cascade');
            $table->string('day', 20); // MONDAY, TUESDAY... or 0-6
            $table->time('open_time');
            $table->time('close_time');
            $table->boolean('is_closed')->default(false);
            $table->timestamps();

            $table->unique(['branch_id', 'day']);
        });

        Schema::create('business.business_social_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->string('platform', 50); // whatsapp, instagram, facebook, tiktok, twitter, youtube, website
            $table->text('url');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['business_id', 'platform']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business.branch_schedules');
        Schema::dropIfExists('business.business_social_links');
    }
};
