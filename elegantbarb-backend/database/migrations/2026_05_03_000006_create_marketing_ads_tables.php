<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing.ads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->string('link_url')->nullable();
            $table->string('placement', 30)->default('HOME');
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('impression_limit')->nullable();
            $table->integer('click_limit')->nullable();
            $table->integer('impressions_count')->default(0);
            $table->integer('clicks_count')->default(0);
            $table->decimal('budget', 12, 2)->nullable();
            $table->decimal('spent', 12, 2)->default(0);
            $table->string('status', 20)->default('PENDING');
            $table->json('targeting')->nullable();
            $table->integer('priority')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['placement', 'status', 'start_date', 'end_date']);
            $table->index(['business_id', 'status']);
        });

        Schema::create('marketing.ad_impressions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ad_id')->constrained('marketing.ads')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('public.users')->onDelete('set null');
            $table->string('context', 50)->nullable();
            $table->timestamps();

            $table->index(['ad_id', 'created_at']);
        });

        Schema::create('marketing.ad_clicks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ad_id')->constrained('marketing.ads')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('public.users')->onDelete('set null');
            $table->string('context', 50)->nullable();
            $table->timestamps();

            $table->index(['ad_id', 'created_at']);
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('marketing.ad_clicks');
        Schema::dropIfExists('marketing.ad_impressions');
        Schema::dropIfExists('marketing.ads');
    }
};
