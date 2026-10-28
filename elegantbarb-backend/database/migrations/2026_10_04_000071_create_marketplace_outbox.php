<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform.marketplace_outbox', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('source_key')->unique();
            $table->string('event', 80);
            $table->unsignedBigInteger('business_id')->nullable();
            $table->foreign('business_id')->references('id')->on('business.businesses');
            $table->jsonb('payload');
            $table->timestampTz('created_at');
        });
        Schema::table('platform.webhook_deliveries', function (Blueprint $table) {
            $table->uuid('outbox_id')->nullable();
            $table->foreign('outbox_id')->references('id')->on('platform.marketplace_outbox');
            $table->string('state', 20)->nullable();
            $table->timestampTz('available_at')->nullable();
            $table->timestampTz('locked_at')->nullable();
            $table->unique(['outbox_id', 'webhook_id']);
            $table->index(['state', 'available_at']);
        });
    }

    public function down(): void
    {
        Schema::table('platform.webhook_deliveries', function (Blueprint $table) {
            // PostgreSQL removes constraints/indexes on these columns in their actual schema.
            $table->dropColumn(['outbox_id', 'state', 'available_at', 'locked_at']);
        });
        Schema::dropIfExists('platform.marketplace_outbox');
    }
};
