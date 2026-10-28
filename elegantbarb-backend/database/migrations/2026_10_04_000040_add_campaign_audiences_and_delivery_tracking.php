<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marketing.campaigns', fn (Blueprint $table) => [
            $table->jsonb('segment')->nullable(),
            $table->foreignId('promotion_id')->nullable()->constrained('marketing.promotions')->nullOnDelete(),
        ]);
        Schema::table('marketing.campaign_logs', fn (Blueprint $table) => [
            $table->unsignedBigInteger('recipient_id')->nullable(),
            $table->unsignedBigInteger('recipient_user_id')->nullable(),
            $table->uuid('tracking_token')->nullable()->unique(),
            $table->timestamp('sent_at')->nullable(),
            $table->timestamp('notification_sent_at')->nullable(),
            $table->index(['campaign_id', 'status']),
        ]);
        Schema::create('marketing.campaign_suppressions', fn (Blueprint $table) => [
            $table->id(),
            $table->foreignId('business_id')->constrained('business.businesses')->cascadeOnDelete(),
            $table->string('email'),
            $table->timestamps(),
            $table->unique(['business_id', 'email']),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing.campaign_suppressions');
        Schema::table('marketing.campaign_logs', fn (Blueprint $table) => [
            $table->dropIndex(['campaign_id', 'status']),
            $table->dropColumn(['recipient_id', 'recipient_user_id', 'tracking_token', 'sent_at', 'notification_sent_at']),
        ]);
        Schema::table('marketing.campaigns', fn (Blueprint $table) => [
            $table->dropConstrainedForeignId('promotion_id'),
            $table->dropColumn('segment'),
        ]);
    }
};
