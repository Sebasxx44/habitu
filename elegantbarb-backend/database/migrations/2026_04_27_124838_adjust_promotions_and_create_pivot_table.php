<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->text('image_url')->nullable()->change();
        });

        Schema::create('promotion_service', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_id')->constrained()->onDelete('cascade');
            $table->foreignId('service_id')->constrained()->onDelete('cascade');
            $table->decimal('discount', 10, 2);
            $table->enum('type', ['PORCENTAJE', 'FIJO']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotion_service');
        Schema::table('promotions', function (Blueprint $table) {
            $table->string('image_url', 255)->nullable()->change();
        });
    }
};
