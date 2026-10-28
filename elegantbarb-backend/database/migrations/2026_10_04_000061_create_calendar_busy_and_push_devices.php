<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform.google_calendar_tokens', function (Blueprint $table) {
            $table->text('sync_token')->nullable();
            $table->timestampTz('last_synced_at')->nullable();
            $table->timestampTz('last_full_sync_at')->nullable();
            $table->string('sync_error')->nullable();
            $table->uuid('channel_id')->nullable()->unique();
            $table->string('channel_token_hash', 64)->nullable();
            $table->string('channel_resource_id')->nullable();
            $table->timestampTz('channel_expires_at')->nullable();
            $table->unsignedBigInteger('channel_message_number')->default(0);
        });
        Schema::create('platform.google_calendar_busy', function (Blueprint $table) {
            $table->id();
            $table->foreignId('professional_id')->constrained('people.professionals')->cascadeOnDelete();
            $table->string('google_event_id');
            $table->timestampTz('starts_at');
            $table->timestampTz('ends_at');
            $table->boolean('is_all_day')->default(false);
            $table->timestamps();
            $table->unique(['professional_id', 'google_event_id']);
            $table->index(['professional_id', 'starts_at', 'ends_at']);
        });
        Schema::create('platform.push_preferences', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained('public.users')->cascadeOnDelete();
            $table->boolean('transactional_enabled')->default(false);
            $table->boolean('promotions_enabled')->default(false);
            $table->timestamps();
        });
        Schema::create('platform.push_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('public.users')->cascadeOnDelete();
            $table->char('token_hash', 64)->unique();
            $table->text('token');
            $table->string('platform', 20)->default('web');
            $table->timestamp('last_seen_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform.push_devices');
        Schema::dropIfExists('platform.push_preferences');
        Schema::dropIfExists('platform.google_calendar_busy');
        Schema::table('platform.google_calendar_tokens', fn (Blueprint $table) => $table->dropColumn([
            'sync_token', 'last_synced_at', 'last_full_sync_at', 'sync_error', 'channel_id', 'channel_token_hash',
            'channel_resource_id', 'channel_expires_at', 'channel_message_number',
        ]));
    }
};
