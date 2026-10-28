<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hours', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('barber_shop_id');
            $table->enum('day', ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']);
            $table->time('open_time');
            $table->time('close_time');
            $table->boolean('closed')->default(false);
            $table->timestamps();
            $table->index('barber_shop_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hours');
    }
};