<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('on_demand.requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('people.clients')->onDelete('cascade');
            $table->foreignId('business_id')->nullable()->constrained('business.businesses')->onDelete('set null');
            $table->foreignId('service_id')->nullable()->constrained('catalog.services')->onDelete('set null');
            $table->foreignId('professional_id')->nullable()->constrained('people.professionals')->onDelete('set null');
            $table->string('request_code', 20)->unique();
            $table->string('status', 30)->default('SEARCHING');
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->decimal('estimated_price', 12, 2)->nullable();
            $table->decimal('final_price', 12, 2)->nullable();
            $table->string('currency', 3)->default('COP');
            $table->decimal('client_lat', 10, 8)->nullable();
            $table->decimal('client_lng', 11, 8)->nullable();
            $table->string('client_address')->nullable();
            $table->decimal('professional_lat', 10, 8)->nullable();
            $table->decimal('professional_lng', 11, 8)->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('arrived_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancellation_reason')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('public.users')->onDelete('set null');
            $table->integer('search_timeout_seconds')->default(300);
            $table->timestamp('search_expires_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'created_at']);
            $table->index(['client_id', 'status']);
            $table->index(['professional_id', 'status']);
            $table->index(['business_id', 'status']);
        });

        Schema::create('on_demand.assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('on_demand.requests')->onDelete('cascade');
            $table->foreignId('professional_id')->constrained('people.professionals')->onDelete('cascade');
            $table->string('status', 30)->default('PENDING');
            $table->timestamp('offered_at')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->boolean('is_auto_assigned')->default(false);
            $table->decimal('distance_km', 8, 2)->nullable();
            $table->timestamps();

            $table->unique(['request_id', 'professional_id']);
            $table->index(['professional_id', 'status']);
        });

        Schema::create('on_demand.status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('on_demand.requests')->onDelete('cascade');
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->foreignId('changed_by')->nullable()->constrained('public.users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['request_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('on_demand.status_history');
        Schema::dropIfExists('on_demand.assignments');
        Schema::dropIfExists('on_demand.requests');
    }
};
