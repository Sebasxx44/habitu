<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking.appointments', fn (Blueprint $table) => $table->uuid('idempotency_key')->nullable()->unique());
        Schema::create('booking.appointment_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('booking.appointments')->cascadeOnDelete();
            $table->string('type', 50);
            $table->text('description')->nullable();
            $table->timestamp('created_at');
            $table->index(['appointment_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking.appointment_events');
        Schema::table('booking.appointments', fn (Blueprint $table) => $table->dropColumn('idempotency_key'));
    }
};
