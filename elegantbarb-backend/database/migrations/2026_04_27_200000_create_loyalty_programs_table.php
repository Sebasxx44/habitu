<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_programs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('barber_shop_id');
            $table->string('name');                          // e.g. "Corte Gratis"
            $table->text('description')->nullable();          // e.g. "Por cada 5 cortes, obtén 1 gratis"
            $table->string('type')->default('STAMP');         // STAMP | POINTS
            $table->integer('stamps_required')->default(5);   // stamps needed to earn reward
            $table->string('reward_description');             // "1 Corte Gratis"
            $table->boolean('active')->default(true);
            $table->date('valid_until')->nullable();
            $table->timestamps();

            $table->foreign('barber_shop_id')->references('id')->on('barber_shops')->onDelete('cascade');
            $table->index('barber_shop_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_programs');
    }
};
