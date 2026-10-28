<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat.conversations', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20)->default('DIRECT');
            $table->string('subject')->nullable();
            $table->foreignId('business_id')->nullable()->constrained('business.businesses')->onDelete('cascade');
            $table->foreignId('appointment_id')->nullable()->constrained('booking.appointments')->onDelete('cascade');
            $table->foreignId('on_demand_request_id')->nullable()->constrained('on_demand.requests')->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['business_id', 'is_active']);
            $table->index(['appointment_id', 'is_active']);
            $table->index(['on_demand_request_id', 'is_active']);
            $table->index(['last_message_at']);
        });

        Schema::create('chat.conversation_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('chat.conversations')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->timestamp('last_read_at')->nullable();
            $table->boolean('is_muted')->default(false);
            $table->timestamps();

            $table->unique(['conversation_id', 'user_id']);
            $table->index(['user_id', 'last_read_at']);
        });

        Schema::create('chat.messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('chat.conversations')->onDelete('cascade');
            $table->foreignId('sender_id')->constrained('public.users')->onDelete('cascade');
            $table->text('content');
            $table->string('message_type', 20)->default('TEXT');
            $table->json('attachments')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->boolean('is_edited')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['conversation_id', 'created_at']);
            $table->index(['sender_id', 'created_at']);
            $table->index(['read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat.messages');
        Schema::dropIfExists('chat.conversation_participants');
        Schema::dropIfExists('chat.conversations');
    }
};
