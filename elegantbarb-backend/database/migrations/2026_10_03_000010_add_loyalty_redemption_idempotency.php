<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty.loyalty_transactions', fn (Blueprint $table) => $table->uuid('idempotency_key')->nullable()->unique());
    }

    public function down(): void
    {
        Schema::table('loyalty.loyalty_transactions', fn (Blueprint $table) => $table->dropColumn('idempotency_key'));
    }
};
