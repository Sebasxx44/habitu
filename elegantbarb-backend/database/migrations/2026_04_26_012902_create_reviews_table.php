<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('barber_shop_id');
            $table->unsignedBigInteger('client_id');
            $table->integer('rating');
            $table->text('comment')->nullable();
            $table->timestamps();
            $table->index('barber_shop_id');
            $table->index('client_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};