<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking.appointments', function (Blueprint $table) {
            $table->id();
            $table->string('booking_code', 20)->nullable()->unique();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('business.business_branches')->onDelete('cascade');
            $table->foreignId('client_id')->constrained('people.clients')->onDelete('cascade');
            $table->foreignId('professional_id')->nullable()->constrained('people.professionals')->onDelete('set null');
            $table->foreignId('service_id')->constrained('catalog.services')->onDelete('cascade');
            $table->foreignId('resource_id')->nullable()->constrained('booking.resources')->onDelete('set null');
            $table->date('date');
            $table->time('start_time');
            $table->time('end_time');
            $table->string('status', 50)->default('PENDING');
            $table->string('payment_status', 50)->default('PENDING');
            $table->decimal('price', 10, 2);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('final_price', 10, 2);
            $table->string('currency', 3)->default('COP');
            $table->text('notes')->nullable();
            $table->string('source', 50)->default('web');
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('business_id');
            $table->index('branch_id');
            $table->index('client_id');
            $table->index('professional_id');
            $table->index('service_id');
            $table->index('date');
            $table->index('status');
            $table->index('booking_code');
        });

        Schema::create('booking.appointment_cancellations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('booking.appointments')->onDelete('cascade');
            $table->text('reason')->nullable();
            $table->string('cancelled_by_type', 50)->nullable();
            $table->bigInteger('cancelled_by_id')->nullable();
            $table->decimal('refund_amount', 10, 2)->nullable();
            $table->timestamp('created_at');
        });

        Schema::create('booking.appointment_reschedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('booking.appointments')->onDelete('cascade');
            $table->date('old_date');
            $table->time('old_start_time');
            $table->foreignId('old_professional_id')->nullable();
            $table->date('new_date');
            $table->time('new_start_time');
            $table->foreignId('new_professional_id')->nullable();
            $table->text('reason')->nullable();
            $table->string('rescheduled_by_type', 50)->nullable();
            $table->bigInteger('rescheduled_by_id')->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking.appointment_reschedules');
        Schema::dropIfExists('booking.appointment_cancellations');
        Schema::dropIfExists('booking.appointments');
    }
};
