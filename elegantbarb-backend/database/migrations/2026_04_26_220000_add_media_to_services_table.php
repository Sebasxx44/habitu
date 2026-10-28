<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('image_url')->nullable()->after('description');
            $table->json('media_gallery')->nullable()->after('image_url');
            $table->string('category')->nullable()->after('media_gallery');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['image_url', 'media_gallery', 'category']);
        });
    }
};
