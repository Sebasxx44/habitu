<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking.check_in_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('reservation_kind', 20);
            $table->unsignedBigInteger('reservation_id');
            $table->string('pin_hash');
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->foreignId('consumed_by')->nullable()->constrained('public.users');
            $table->text('manual_reason')->nullable();
            $table->timestamps();
            $table->unique(['reservation_kind', 'reservation_id']);
        });
        Schema::create('booking.reservation_incidents', function (Blueprint $table) {
            $table->id();
            $table->string('case_number')->unique();
            $table->string('reservation_kind', 20);
            $table->unsignedBigInteger('reservation_id');
            $table->foreignId('business_id')->nullable()->constrained('business.businesses');
            $table->foreignId('reported_by')->constrained('public.users');
            $table->foreignId('assigned_to')->nullable()->constrained('public.users');
            $table->string('category', 40);
            $table->text('description');
            $table->string('status', 20)->default('OPEN');
            $table->timestamp('response_due_at')->nullable();
            $table->text('resolution')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['reservation_kind', 'reservation_id']);
        });
        Schema::create('on_demand.professional_presence', function (Blueprint $table) {
            $table->foreignId('professional_id')->primary()->constrained('people.professionals')->cascadeOnDelete();
            $table->boolean('is_paused')->default(false);
            $table->timestamp('updated_at');
        });
        Schema::create('chat.attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('chat.conversations')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('public.users');
            $table->string('path');
            $table->string('name');
            $table->string('mime_type', 100);
            $table->unsignedInteger('size');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat.attachments');
        Schema::dropIfExists('on_demand.professional_presence');
        Schema::dropIfExists('booking.reservation_incidents');
        Schema::dropIfExists('booking.check_in_tokens');
    }
};
