<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Gamification XP log
        Schema::create('platform.gamification_xp', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->integer('points');
            $table->string('action', 50); // BOOK_APPOINTMENT, COMPLETE_APPOINTMENT, REVIEW, REFERRAL, STREAK
            $table->string('description')->nullable();
            $table->morphs('source'); // appointable, reviewable, etc.
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });

        // Badges
        Schema::create('platform.gamification_badges', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description');
            $table->string('icon', 100); // lucide icon name
            $table->string('color', 20)->default('#D4AF37');
            $table->string('category', 30)->default('GENERAL'); // BOOKING, LOYALTY, SOCIAL, MASTERY
            $table->integer('required_points')->default(0);
            $table->json('conditions')->nullable(); // {"appointments_count": 10, "streak_days": 5}
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // User badges (earned)
        Schema::create('platform.user_badges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->foreignId('badge_id')->constrained('platform.gamification_badges')->onDelete('cascade');
            $table->timestamp('earned_at');
            $table->timestamps();
            $table->unique(['user_id', 'badge_id']);
        });

        // Leaderboard snapshots
        Schema::create('platform.leaderboards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->nullable()->constrained('business.businesses')->onDelete('cascade');
            $table->string('type', 30); // GLOBAL, BUSINESS, PROFESSIONAL
            $table->string('period', 20); // WEEK, MONTH, YEAR, ALL_TIME
            $table->date('period_start');
            $table->date('period_end');
            $table->foreignId('user_id')->constrained('public.users')->onDelete('cascade');
            $table->integer('rank');
            $table->integer('total_points');
            $table->integer('appointments_count')->default(0);
            $table->decimal('total_spent', 12, 2)->default(0);
            $table->timestamps();
            $table->index(['business_id', 'type', 'period', 'rank']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform.leaderboards');
        Schema::dropIfExists('platform.user_badges');
        Schema::dropIfExists('platform.gamification_badges');
        Schema::dropIfExists('platform.gamification_xp');
    }
};
