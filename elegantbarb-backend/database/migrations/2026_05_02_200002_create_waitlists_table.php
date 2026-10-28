<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking.waitlists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('people.clients')->onDelete('cascade');
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->foreignId('service_id')->constrained('catalog.services')->onDelete('cascade');
            $table->foreignId('professional_id')->nullable()->constrained('people.professionals')->onDelete('set null');
            $table->date('preferred_date')->nullable();
            $table->time('preferred_time_start')->nullable();
            $table->time('preferred_time_end')->nullable();
            $table->enum('status', ['PENDING', 'NOTIFIED', 'CONVERTED', 'EXPIRED', 'CANCELLED'])->default('PENDING');
            $table->timestamp('notified_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['business_id', 'status']);
            $table->index(['client_id', 'status']);
            $table->index(['preferred_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking.waitlists');
    }
};
