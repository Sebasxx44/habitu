<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('barber_shop_id');
            $table->unsignedBigInteger('barber_id');
            $table->unsignedBigInteger('client_id');
            $table->unsignedBigInteger('service_id');
            $table->date('date');
            $table->time('time');
            $table->enum('status', ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'])->default('PENDIENTE');
            $table->decimal('price', 10, 2);
            $table->boolean('paid')->default(false);
            $table->timestamps();

            $table->index('barber_shop_id');
            $table->index('barber_id');
            $table->index('client_id');
            $table->index('service_id');
            $table->index('date');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};