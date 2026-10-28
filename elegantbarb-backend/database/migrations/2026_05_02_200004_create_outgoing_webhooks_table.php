<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform.outgoing_webhooks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('public.users')->onDelete('set null');
            $table->string('name');
            $table->string('url');
            $table->string('secret');
            $table->json('events'); // ['appointment.created', 'on-demand.completed']
            $table->boolean('active')->default(true);
            $table->integer('timeout')->default(30);
            $table->integer('retry_count')->default(3);
            $table->timestamps();
        });

        Schema::create('platform.webhook_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('webhook_id')->constrained('platform.outgoing_webhooks')->onDelete('cascade');
            $table->string('event');
            $table->json('payload');
            $table->smallInteger('status_code')->nullable();
            $table->text('response_body')->nullable();
            $table->text('error_message')->nullable();
            $table->integer('attempt')->default(1);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform.webhook_deliveries');
        Schema::dropIfExists('platform.outgoing_webhooks');
    }
};
