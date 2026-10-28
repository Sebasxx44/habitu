<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barbers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('barber_shop_id');
            $table->string('name');
            $table->string('specialty');
            $table->string('phone');
            $table->string('email');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index('barber_shop_id');
            $table->index('active');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barbers');
    }
};