<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance.wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->decimal('balance', 14, 2)->default(0);
            $table->decimal('hold_balance', 14, 2)->default(0);
            $table->string('currency', 3)->default('COP');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique('user_id');
            $table->index(['user_id', 'is_active']);
        });

        Schema::create('finance.wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained('finance.wallets')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->string('type', 30);
            $table->decimal('amount', 14, 2);
            $table->decimal('balance_before', 14, 2);
            $table->decimal('balance_after', 14, 2);
            $table->string('status', 30)->default('COMPLETED');
            $table->string('source_type', 50)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('payment_method', 30)->nullable();
            $table->string('external_reference')->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['wallet_id', 'created_at']);
            $table->index(['user_id', 'type', 'created_at']);
            $table->index(['source_type', 'source_id']);
            $table->index(['external_reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance.wallet_transactions');
        Schema::dropIfExists('finance.wallets');
    }
};
