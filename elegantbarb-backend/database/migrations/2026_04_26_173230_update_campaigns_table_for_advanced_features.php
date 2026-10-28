<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->string('status')->default('DRAFT')->after('type');
            $table->string('target_role')->default('CLIENTE')->after('status');
            $table->json('target_ids')->nullable()->after('target_role');
            $table->text('error_log')->nullable()->after('sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn(['status', 'target_role', 'target_ids', 'error_log']);
        });
    }
};
