<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE business.businesses ALTER COLUMN rating SET DEFAULT 0');
        DB::update('UPDATE business.businesses AS business SET rating = 0
            WHERE business.slug IN (?, ?, ?) AND business.reviews_count = 0
            AND NOT EXISTS (SELECT 1 FROM reviews.reviews AS review WHERE review.business_id = business.id)', [
            'cuba-prueba-bambinos', 'cuba-prueba-imperio', 'cuba-prueba-barber-house-studio',
        ]);
    }

    public function down(): void
    {
        // Restore only the previous schema default; never recreate corrected historical ratings.
        DB::statement('ALTER TABLE business.businesses ALTER COLUMN rating SET DEFAULT 5.0');
    }
};
