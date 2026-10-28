<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business.businesses', fn (Blueprint $table) => $table->string('analytics_environment', 15)->default('UNCLASSIFIED')->index());
    }

    public function down(): void
    {
        Schema::table('business.businesses', fn (Blueprint $table) => $table->dropColumn('analytics_environment'));
    }
};
