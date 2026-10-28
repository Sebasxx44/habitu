<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auth.two_factor_auths', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->string('secret');
            $table->json('recovery_codes')->nullable();
            $table->boolean('enabled')->default(false);
            $table->timestamp('enabled_at')->nullable();
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auth.two_factor_auths');
    }
};
