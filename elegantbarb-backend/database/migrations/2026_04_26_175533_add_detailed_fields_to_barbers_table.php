<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('barbers', function (Blueprint $row) {
            $row->string('photo_url')->nullable()->after('email');
            $row->text('bio')->nullable()->after('photo_url');
            $row->decimal('commission_percentage', 5, 2)->default(50.00)->after('bio');
            $row->json('social_media')->nullable()->after('commission_percentage');
            $row->string('address')->nullable()->after('social_media');
            $row->date('birthday')->nullable()->after('address');
            $row->string('identification_number')->nullable()->after('birthday');
        });
    }

    public function down(): void
    {
        Schema::table('barbers', function (Blueprint $row) {
            $row->dropColumn([
                'photo_url', 'bio', 'commission_percentage', 
                'social_media', 'address', 'birthday', 'identification_number'
            ]);
        });
    }
};
