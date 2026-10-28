<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('client_id');
            $table->unsignedBigInteger('barber_shop_id');
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['ACTIVA', 'VENCIDA', 'CANCELADA'])->default('ACTIVA');
            $table->timestamps();

            $table->index('client_id');
            $table->index('barber_shop_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};