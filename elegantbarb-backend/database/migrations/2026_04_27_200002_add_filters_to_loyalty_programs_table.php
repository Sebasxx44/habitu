<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_programs', function (Blueprint $table) {
            $table->unsignedBigInteger('barber_id')->nullable()->after('barber_shop_id');
            $table->unsignedBigInteger('service_id')->nullable()->after('barber_id');
            
            $table->foreign('barber_id')->references('id')->on('barbers')->onDelete('set null');
            $table->foreign('service_id')->references('id')->on('services')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('loyalty_programs', function (Blueprint $table) {
            $table->dropForeign(['barber_id']);
            $table->dropForeign(['service_id']);
            $table->dropColumn(['barber_id', 'service_id']);
        });
    }
};
