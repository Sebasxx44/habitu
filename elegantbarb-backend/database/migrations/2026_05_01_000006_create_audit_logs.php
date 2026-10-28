<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform.audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable();
            $table->string('user_name')->nullable();
            $table->string('user_role')->nullable();
            $table->foreignId('business_id')->nullable();
            $table->string('action', 100); // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, EXPORT
            $table->string('entity_type', 100);
            $table->bigInteger('entity_id')->nullable();
            $table->jsonb('old_values')->nullable();
            $table->jsonb('new_values')->nullable();
            $table->jsonb('metadata')->nullable(); // ip, user_agent, endpoint, method
            $table->text('reason')->nullable();
            $table->timestamp('created_at');

            $table->index('user_id');
            $table->index('business_id');
            $table->index(['entity_type', 'entity_id']);
            $table->index('created_at');
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform.audit_logs');
    }
};
