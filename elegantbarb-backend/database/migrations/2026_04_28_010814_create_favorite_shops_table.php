<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favorite_shops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('barber_shop_id')->constrained('barber_shops')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['client_id', 'barber_shop_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favorite_shops');
    }
};
