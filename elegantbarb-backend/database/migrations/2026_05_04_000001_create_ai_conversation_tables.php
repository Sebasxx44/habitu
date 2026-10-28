<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // AI Conversations
        Schema::create('platform.ai_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->string('session_id')->unique();
            $table->string('context_type', 30)->default('GENERAL'); // GENERAL, BOOKING, ON_DEMAND, SUPPORT
            $table->json('context_data')->nullable();
            $table->string('status', 20)->default('ACTIVE');
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'status']);
        });

        // AI Messages
        Schema::create('platform.ai_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('platform.ai_conversations')->onDelete('cascade');
            $table->string('role', 20); // user, assistant, system, tool
            $table->text('content');
            $table->json('metadata')->nullable(); // tokens, model, latency_ms
            $table->json('tool_calls')->nullable(); // function calls
            $table->timestamps();
            $table->index(['conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform.ai_messages');
        Schema::dropIfExists('platform.ai_conversations');
    }
};
