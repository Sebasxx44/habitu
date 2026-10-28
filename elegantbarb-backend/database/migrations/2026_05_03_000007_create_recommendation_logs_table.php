<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform.recommendation_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->string('recommendation_type', 30);
            $table->morphs('recommendable');
            $table->decimal('score', 8, 4)->default(0);
            $table->string('algorithm', 30)->default('HYBRID');
            $table->json('factors')->nullable();
            $table->boolean('was_clicked')->default(false);
            $table->boolean('was_booked')->default(false);
            $table->timestamp('clicked_at')->nullable();
            $table->timestamp('booked_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'recommendation_type', 'score']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform.recommendation_logs');
    }
};
