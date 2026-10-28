<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking.routines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('source_appointment_id')->nullable()->constrained('booking.appointments')->nullOnDelete();
            $table->string('name', 120);
            $table->string('status', 12)->default('ACTIVE');
            $table->unsignedSmallInteger('interval_weeks');
            $table->jsonb('template');
            $table->timestamps();
        });
        Schema::create('booking.routine_occurrences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('routine_id')->constrained('booking.routines')->cascadeOnDelete();
            $table->unsignedSmallInteger('position');
            $table->date('date');
            $table->time('start_time');
            $table->string('status', 12)->default('PLANNED');
            $table->foreignId('appointment_id')->nullable()->constrained('booking.appointments')->nullOnDelete();
            $table->jsonb('accepted_conditions')->nullable();
            $table->timestamps();
            $table->unique(['routine_id', 'position']);
            $table->unique('appointment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking.routine_occurrences');
        Schema::dropIfExists('booking.routines');
    }
};
