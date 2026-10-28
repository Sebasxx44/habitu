<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance.payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->nullable();
            $table->foreignId('client_id');
            $table->foreignId('business_id');
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('COP');
            $table->string('method', 50); // CASH, CARD, PSE, MERCADOPAGO, TRANSFER
            $table->string('external_transaction_id')->nullable();
            $table->string('status', 50)->default('PENDING'); // PENDING, COMPLETED, FAILED, REFUNDED
            $table->jsonb('gateway_response')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();

            $table->index('appointment_id');
            $table->index('client_id');
            $table->index('business_id');
            $table->index('status');
            $table->index('external_transaction_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance.payments');
    }
};
