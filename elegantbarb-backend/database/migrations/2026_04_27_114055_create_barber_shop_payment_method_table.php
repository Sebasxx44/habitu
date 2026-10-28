<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barber_shop_payment_method', function (Blueprint $table) {
            $table->id();
            $table->foreignId('barber_shop_id')->constrained()->onDelete('cascade');
            $table->foreignId('payment_method_id')->constrained()->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->text('instructions')->nullable(); // For things like Yape/Zelle instructions
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barber_shop_payment_method');
    }
};
