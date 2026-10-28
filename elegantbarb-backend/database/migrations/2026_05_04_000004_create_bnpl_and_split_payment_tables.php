<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance.bnpl_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('people.clients')->onDelete('cascade');
            $table->foreignId('appointment_id')->constrained('booking.appointments')->onDelete('cascade');
            $table->decimal('total_amount', 12, 2);
            $table->integer('installments_count')->default(3); // 3, 6, 12
            $table->decimal('interest_rate', 5, 2)->default(0); // 0% for BNPL
            $table->string('status', 20)->default('PENDING'); // PENDING, APPROVED, REJECTED, ACTIVE, COMPLETED, DEFAULTED
            $table->string('provider', 30)->default('INTERNAL'); // INTERNAL, ADDI, KUESKI, MERCADO_CREDITO
            $table->string('provider_reference')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['client_id', 'status']);
        });

        Schema::create('finance.bnpl_installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bnpl_application_id')->constrained('finance.bnpl_applications')->onDelete('cascade');
            $table->integer('installment_number');
            $table->decimal('amount', 12, 2);
            $table->date('due_date');
            $table->date('paid_date')->nullable();
            $table->string('status', 20)->default('PENDING'); // PENDING, PAID, LATE, DEFAULTED
            $table->timestamps();
            $table->unique(['bnpl_application_id', 'installment_number']);
        });

        Schema::create('finance.split_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('booking.appointments')->onDelete('cascade');
            $table->decimal('total_amount', 12, 2);
            $table->integer('split_count');
            $table->string('status', 20)->default('PENDING');
            $table->timestamps();
        });

        Schema::create('finance.split_payment_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('split_payment_id')->constrained('finance.split_payments')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->decimal('amount', 12, 2);
            $table->string('status', 20)->default('PENDING'); // PENDING, PAID
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance.split_payment_participants');
        Schema::dropIfExists('finance.split_payments');
        Schema::dropIfExists('finance.bnpl_installments');
        Schema::dropIfExists('finance.bnpl_applications');
    }
};
