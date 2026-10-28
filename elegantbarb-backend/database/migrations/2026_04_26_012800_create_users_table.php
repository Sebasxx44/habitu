<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('role', ['SUPERADMIN', 'ADMIN_BARBERIA', 'PROFESSIONAL', 'CLIENTE'])->default('CLIENTE');
            $table->unsignedBigInteger('barber_shop_id')->nullable();
            $table->unsignedBigInteger('barber_id')->nullable();
            $table->unsignedBigInteger('cliente_id')->nullable();
            $table->rememberToken();
            $table->timestamps();

            $table->index('barber_shop_id');
            $table->index('role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
