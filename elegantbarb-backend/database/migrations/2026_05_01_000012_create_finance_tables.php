<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance.expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained('business.business_branches')->onDelete('set null');
            $table->foreignId('professional_id')->nullable()->constrained('people.professionals')->onDelete('set null');
            $table->string('description');
            $table->decimal('amount', 10, 2);
            $table->string('category', 50); // SERVICES, PRODUCTS, PAYROLL, RENT, UTILITIES, MARKETING, OTHER
            $table->date('date');
            $table->text('receipt_url')->nullable();
            $table->timestamps();

            $table->index('business_id');
            $table->index('category');
            $table->index('date');
        });

        Schema::create('finance.professional_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('professional_id')->constrained('people.professionals')->onDelete('cascade');
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->decimal('amount', 12, 2);
            $table->date('period_start');
            $table->date('period_end');
            $table->string('status', 50)->default('PENDING');
            $table->text('notes')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('paid_by')->nullable();
            $table->timestamps();

            $table->index('professional_id');
            $table->index('business_id');
            $table->index('status');
        });

        Schema::create('finance.payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->unique(); // cash, card, pse, mercadopago, transfer
            $table->string('icon')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('finance.subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('people.clients')->onDelete('cascade');
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->string('plan_name');
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 50)->default('ACTIVE');
            $table->decimal('price', 10, 2);
            $table->timestamps();

            $table->index('client_id');
            $table->index('business_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance.subscriptions');
        Schema::dropIfExists('finance.payment_methods');
        Schema::dropIfExists('finance.professional_payouts');
        Schema::dropIfExists('finance.expenses');
    }
};
