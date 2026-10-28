<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking.smart_queues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained('business.business_branches')->onDelete('cascade');
            $table->string('name', 100)->default('Fila Principal');
            $table->string('status', 20)->default('ACTIVE'); // ACTIVE, PAUSED, CLOSED
            $table->integer('current_number')->default(0);
            $table->integer('estimated_wait_minutes')->default(0);
            $table->timestamps();
            $table->index(['business_id', 'branch_id', 'status']);
        });

        Schema::create('booking.smart_queue_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('queue_id')->constrained('booking.smart_queues')->onDelete('cascade');
            $table->foreignId('client_id')->constrained('people.clients')->onDelete('cascade');
            $table->integer('ticket_number');
            $table->string('status', 20)->default('WAITING'); // WAITING, CALLED, SERVING, COMPLETED, CANCELLED
            $table->integer('estimated_wait_minutes')->nullable();
            $table->timestamp('called_at')->nullable();
            $table->timestamp('served_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['queue_id', 'status', 'ticket_number']);
        });

        Schema::create('booking.smart_queue_displays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('queue_id')->constrained('booking.smart_queues')->onDelete('cascade');
            $table->string('display_name')->default('Pantalla Principal');
            $table->string('display_code', 10)->unique(); // código para vincular pantalla física
            $table->json('settings')->nullable(); // {sound: true, theme: 'dark'}
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking.smart_queue_displays');
        Schema::dropIfExists('booking.smart_queue_entries');
        Schema::dropIfExists('booking.smart_queues');
    }
};
