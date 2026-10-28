<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking.notification_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('booking.appointments')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('event_key', 180);
            $table->foreignId('notification_id')->nullable()->constrained('marketing.notifications')->nullOnDelete();
            $table->jsonb('payload');
            $table->string('status', 20)->default('PENDING');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('queued_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->string('last_error', 80)->nullable();
            $table->timestamps();
            $table->unique(['event_key', 'user_id']);
            $table->index(['status', 'queued_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking.notification_deliveries');
    }
};
