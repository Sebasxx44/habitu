<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_cards', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loyalty_program_id');
            $table->unsignedBigInteger('client_id');
            $table->unsignedBigInteger('barber_shop_id');
            $table->integer('current_stamps')->default(0);      // stamps collected in this cycle
            $table->integer('total_stamps_ever')->default(0);   // lifetime stamps earned
            $table->integer('rewards_redeemed')->default(0);    // times reward has been given
            $table->boolean('reward_available')->default(false); // true when stamps_required reached
            $table->enum('status', ['ACTIVE', 'COMPLETED', 'SUSPENDED'])->default('ACTIVE');
            $table->timestamp('last_stamp_at')->nullable();
            $table->timestamps();

            $table->foreign('loyalty_program_id')->references('id')->on('loyalty_programs')->onDelete('cascade');
            $table->foreign('client_id')->references('id')->on('clients')->onDelete('cascade');
            $table->foreign('barber_shop_id')->references('id')->on('barber_shops')->onDelete('cascade');
            $table->unique(['loyalty_program_id', 'client_id']); // one card per client per program
            $table->index(['barber_shop_id', 'status']);
            $table->index('client_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_cards');
    }
};
