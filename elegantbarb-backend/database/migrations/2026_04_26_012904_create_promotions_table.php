<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('barber_shop_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('discount', 5, 2);
            $table->enum('type', ['PORCENTAJE', 'FIJO']);
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index('barber_shop_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};