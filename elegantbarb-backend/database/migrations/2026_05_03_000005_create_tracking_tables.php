<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tracking.location_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->foreignId('professional_id')->nullable()->constrained('people.professionals')->onDelete('cascade');
            $table->morphs('trackable');
            $table->decimal('lat', 10, 8);
            $table->decimal('lng', 11, 8);
            $table->decimal('accuracy', 8, 2)->nullable();
            $table->decimal('speed', 8, 2)->nullable();
            $table->decimal('heading', 8, 2)->nullable();
            $table->timestamp('recorded_at')->useCurrent();
            $table->timestamps();

            $table->index(['trackable_type', 'trackable_id', 'created_at']);
            $table->index(['professional_id', 'created_at']);
            $table->index(['lat', 'lng']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tracking.location_updates');
    }
};
