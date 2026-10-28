<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marketing.retention_actions', fn (Blueprint $table) => $table->timestampTz('clicked_at')->nullable());
        Schema::create('marketing.retention_attributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('action_id')->constrained('marketing.retention_actions');
            $table->foreignId('appointment_id')->unique()->constrained('booking.appointments');
            $table->timestampTz('created_at');
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('marketing.retention_attributions');
        Schema::table('marketing.retention_actions', fn (Blueprint $table) => $table->dropColumn('clicked_at'));
    }
};
