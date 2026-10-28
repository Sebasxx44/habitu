<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform.dynamic_pricing_rules', function (Blueprint $table) {
            $table->string('name', 100)->nullable();
            $table->string('timezone', 64)->default('America/Bogota');
        });
        Schema::table('booking.appointments', fn (Blueprint $table) => $table->json('dynamic_pricing')->nullable());
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 30)->nullable();
            $table->string('avatar_path')->nullable();
            $table->json('preferences')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['phone', 'avatar_path', 'preferences']));
        Schema::table('booking.appointments', fn (Blueprint $table) => $table->dropColumn('dynamic_pricing'));
        Schema::table('platform.dynamic_pricing_rules', fn (Blueprint $table) => $table->dropColumn(['name', 'timezone']));
    }
};
