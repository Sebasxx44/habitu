<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('finance.checkout_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('public.users')->restrictOnDelete();
            $table->uuid('idempotency_key');
            $table->string('reference', 60)->unique();
            $table->string('purpose', 30);
            $table->unsignedBigInteger('target_id')->nullable();
            $table->bigInteger('amount_in_cents');
            $table->string('currency', 3)->default('COP');
            $table->string('environment', 4);
            $table->string('status', 20)->default('PENDING');
            $table->string('provider_transaction_id', 100)->nullable()->unique();
            $table->string('payment_method', 40)->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestampTz('expires_at');
            $table->timestampTz('credited_at')->nullable();
            $table->timestampsTz();
            $table->unique(['user_id', 'idempotency_key']);
            $table->index(['user_id', 'created_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('finance.checkout_orders'); }
};
