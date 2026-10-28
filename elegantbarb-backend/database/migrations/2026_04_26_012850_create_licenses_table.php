<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licenses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('barbershop_id');
            $table->unsignedBigInteger('plan_id');
            $table->enum('status', ['ACTIVA', 'VENCIDA', 'SUSPENDIDA'])->default('ACTIVA');
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('price', 12, 2)->default(0);
            $table->timestamps();

            $table->index('barbershop_id');
            $table->index('plan_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licenses');
    }
};