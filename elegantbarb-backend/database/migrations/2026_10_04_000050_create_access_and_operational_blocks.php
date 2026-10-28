<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
        Schema::table('people.professional_availability', function (Blueprint $table) {
            $table->time('break_start_time')->nullable();
            $table->time('break_end_time')->nullable();
        });
        Schema::create('booking.operational_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('business.business_branches')->cascadeOnDelete();
            $table->foreignId('professional_id')->nullable()->constrained('people.professionals')->cascadeOnDelete();
            $table->foreignId('resource_id')->nullable()->constrained('booking.resources')->cascadeOnDelete();
            $table->string('kind', 20);
            $table->timestampTz('starts_at');
            $table->timestampTz('ends_at');
            $table->string('reason', 500);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->index(['business_id', 'starts_at', 'ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking.operational_blocks');
        Schema::table('people.professional_availability', fn (Blueprint $table) => $table->dropColumn(['break_start_time', 'break_end_time']));
        Schema::dropIfExists('password_reset_tokens');
    }
};
