<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform.dynamic_pricing_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->nullable()->constrained('business.businesses')->onDelete('cascade');
            $table->foreignId('service_id')->nullable()->constrained('catalog.services')->onDelete('cascade');
            $table->string('rule_type', 30); // PEAK_HOUR, DAY_OF_WEEK, DEMAND, WEATHER, PROFESSIONAL_REPUTATION, URGENCY
            $table->json('conditions'); // {"day_of_week":5, "hour_start":17, "hour_end":20}
            $table->decimal('multiplier', 5, 2)->default(1.00); // 1.00 = 100%, 1.50 = +50%
            $table->decimal('flat_adjustment', 12, 2)->nullable(); // +/- COP
            $table->integer('priority')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
            $table->index(['business_id', 'rule_type', 'is_active']);
        });

        Schema::create('platform.dynamic_pricing_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('business.businesses')->onDelete('cascade');
            $table->date('date');
            $table->integer('hour');
            $table->decimal('base_price', 12, 2);
            $table->decimal('final_price', 12, 2);
            $table->json('applied_rules');
            $table->decimal('demand_score', 5, 2)->default(0); // 0.0 - 10.0
            $table->timestamps();
            $table->unique(['business_id', 'date', 'hour']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform.dynamic_pricing_snapshots');
        Schema::dropIfExists('platform.dynamic_pricing_rules');
    }
};
