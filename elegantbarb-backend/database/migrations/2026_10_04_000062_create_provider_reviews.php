<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform.provider_checks', function (Blueprint $table) {
            $table->id();
            $table->string('subject_key');
            $table->foreignId('business_id')->constrained('business.businesses');
            $table->foreignId('professional_id')->nullable()->constrained('people.professionals');
            $table->string('code', 60);
            $table->string('state', 20)->default('PENDING');
            $table->unsignedInteger('revision')->default(1);
            $table->foreignId('submitted_by')->constrained('public.users');
            $table->foreignId('reviewed_by')->nullable()->constrained('public.users');
            $table->text('review_note')->nullable();
            $table->timestampTz('reviewed_at')->nullable();
            $table->timestampTz('expires_at')->nullable();
            $table->timestampsTz();
            $table->unique(['subject_key', 'code']);
        });
        Schema::create('platform.provider_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('check_id')->constrained('platform.provider_checks');
            $table->unsignedInteger('revision');
            $table->foreignId('uploaded_by')->constrained('public.users');
            $table->string('path');
            $table->string('name');
            $table->string('mime_type', 60);
            $table->unsignedInteger('size');
            $table->string('sha256', 64);
            $table->timestampTz('created_at');
            $table->timestampTz('purged_at')->nullable();
        });
        Schema::create('platform.provider_review_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('check_id')->constrained('platform.provider_checks');
            $table->foreignId('actor_id')->nullable()->constrained('public.users');
            $table->unsignedInteger('revision');
            $table->string('action', 30);
            $table->string('from_state', 20)->nullable();
            $table->string('to_state', 20);
            $table->text('reason')->nullable();
            $table->timestampTz('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform.provider_review_events');
        Schema::dropIfExists('platform.provider_documents');
        Schema::dropIfExists('platform.provider_checks');
    }
};
