<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform.feature_flag_scopes', function (Blueprint $table) {
            $table->id();
            $table->string('flag', 100);
            $table->string('scope_type', 20);
            $table->unsignedBigInteger('scope_id');
            $table->boolean('enabled')->default(false);
            $table->timestamps();
            $table->unique(['flag', 'scope_type', 'scope_id']);
        });
        Schema::create('booking.groups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organizer_id');
            $table->foreign('organizer_id')->references('id')->on('public.users');
            $table->unsignedBigInteger('appointment_id')->nullable()->unique();
            $table->foreign('appointment_id')->references('id')->on('booking.appointments');
            $table->string('title', 120);
            $table->string('invite_hash', 64)->unique();
            $table->timestampTz('expires_at');
            $table->unsignedSmallInteger('member_limit')->default(20);
            $table->string('status', 20)->default('OPEN');
            $table->timestampsTz();
        });
        Schema::create('booking.group_members', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('group_id');
            $table->foreign('group_id')->references('id')->on('booking.groups')->cascadeOnDelete();
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('id')->on('public.users');
            $table->string('response', 20)->default('CONFIRMED');
            $table->timestampsTz();
            $table->unique(['group_id', 'user_id']);
        });
        Schema::create('booking.group_options', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('group_id');
            $table->foreign('group_id')->references('id')->on('booking.groups')->cascadeOnDelete();
            $table->string('label', 160);
            $table->timestampsTz();
        });
        Schema::create('booking.group_votes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('group_id');
            $table->foreign('group_id')->references('id')->on('booking.groups')->cascadeOnDelete();
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('id')->on('public.users');
            $table->unsignedBigInteger('option_id');
            $table->foreign('option_id')->references('id')->on('booking.group_options')->cascadeOnDelete();
            $table->timestampsTz();
            $table->unique(['group_id', 'user_id']);
        });
        foreach (['group_coordination', 'routines'] as $flag) DB::table('platform.feature_flags')->insertOrIgnore([
            'name' => $flag, 'enabled' => true, 'user_percentage' => 100, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        foreach (['booking.group_votes', 'booking.group_options', 'booking.group_members', 'booking.groups', 'platform.feature_flag_scopes'] as $table) Schema::dropIfExists($table);
        DB::table('platform.feature_flags')->whereIn('name', ['group_coordination', 'routines'])->delete();
    }
};
