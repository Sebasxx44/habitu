<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance.wallet_topups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->decimal('amount', 14, 2);
            $table->string('external_reference')->nullable();
            $table->string('preference_id')->nullable();
            $table->string('status', 30)->default('PENDING');
            $table->string('payment_id')->nullable();
            $table->timestamps();
        });

        Schema::create('finance.withdrawals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->decimal('amount', 14, 2);
            $table->string('bank_name');
            $table->string('bank_account');
            $table->string('status', 30)->default('PENDING');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance.withdrawals');
        Schema::dropIfExists('finance.wallet_topups');
    }
};
