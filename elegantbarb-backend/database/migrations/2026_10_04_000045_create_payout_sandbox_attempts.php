<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('finance.payout_sandbox_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('withdrawal_id')->unique()->constrained('finance.withdrawals')->restrictOnDelete();
            $table->foreignId('prepared_by')->constrained('public.users')->restrictOnDelete();
            $table->string('state', 30)->default('READY');
            $table->string('reference', 64)->unique();
            $table->text('encrypted_payload');
            $table->string('payload_hash', 64);
            $table->string('provider_payout_id')->nullable();
            $table->string('provider_transaction_id')->nullable();
            $table->string('provider_status', 40)->nullable();
            $table->timestampTz('first_submitted_at')->nullable();
            $table->timestampTz('last_submitted_at')->nullable();
            $table->timestampTz('reconciled_at')->nullable();
            $table->string('resolution', 80)->nullable();
            $table->timestampsTz();
        });
        Schema::create('finance.payout_sandbox_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('attempt_id')->references('id')->on('finance.payout_sandbox_attempts')->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('public.users')->restrictOnDelete();
            $table->string('state', 30);
            $table->string('resolution', 80)->nullable();
            $table->timestampTz('created_at');
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('finance.payout_sandbox_events');
        Schema::dropIfExists('finance.payout_sandbox_attempts');
    }
};
