<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('barber_shop_id');
            $table->string('description');
            $table->decimal('amount', 10, 2);
            $table->enum('category', ['SERVICIOS', 'PRODUCTOS', 'NOMINA', 'ARRIENDO', 'SERVICIOS_PUBLICOS', 'MARKETING', 'OTROS']);
            $table->date('date');
            $table->timestamps();
            $table->index('barber_shop_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};