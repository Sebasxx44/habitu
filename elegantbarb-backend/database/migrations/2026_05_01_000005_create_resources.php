<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking.resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('business.business_branches')->onDelete('cascade');
            $table->string('name');
            $table->string('type', 50)->default('OTHER'); // FIELD, ROOM, CHAIR, CABIN, MACHINE, SPACE, COURT, OTHER
            $table->text('description')->nullable();
            $table->integer('capacity')->default(1);
            $table->text('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('business_id');
            $table->index('branch_id');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking.resources');
    }
};
