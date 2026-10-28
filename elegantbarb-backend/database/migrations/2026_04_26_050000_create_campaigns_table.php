<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('barber_shop_id')->nullable()->constrained('barber_shops');
            $table->string('subject');
            $table->text('body');
            $table->enum('type', ['PROMO', 'NEWS', 'REMINDER', 'CUSTOM'])->default('CUSTOM');
            $table->integer('recipients_count')->default(0);
            $table->integer('sent_count')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};