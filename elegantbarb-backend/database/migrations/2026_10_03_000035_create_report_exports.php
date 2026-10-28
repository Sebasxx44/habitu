<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('public.report_exports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->jsonb('business_ids');
            $table->jsonb('filters');
            $table->string('fingerprint', 64);
            $table->string('status', 20)->default('queued');
            $table->unsignedInteger('attempts')->default(0);
            $table->unsignedBigInteger('rows_processed')->default(0);
            $table->string('error')->nullable();
            $table->timestampTz('expires_at');
            $table->timestampsTz();
            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'fingerprint']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('public.report_exports');
    }
};
