<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalog.services', function (Blueprint $table) {
            $table->string('booking_model', 30)->nullable();
            $table->string('duration_mode', 20)->default('fixed');
            $table->jsonb('duration_options')->nullable();
            $table->integer('booking_capacity')->default(1);
            $table->integer('slot_interval_minutes')->default(15);
            $table->integer('min_advance_minutes')->default(0);
            $table->integer('max_advance_days')->nullable();
            $table->boolean('requires_confirmation')->default(true);
            $table->boolean('allow_cancellation')->default(true);
            $table->boolean('allow_reschedule')->default(true);
            $table->integer('cancellation_notice_minutes')->default(0);
            $table->integer('reschedule_notice_minutes')->default(0);
            $table->boolean('resource_professional_optional')->default(false);
        });
        DB::statement("UPDATE catalog.services s SET booking_model = CASE
            WHEN b.uses_resources AND NOT b.uses_professionals THEN 'resource'
            WHEN s.requires_professional OR EXISTS (SELECT 1 FROM catalog.professional_services p WHERE p.service_id=s.id AND p.is_active) THEN 'professional'
            WHEN b.uses_resources THEN 'resource'
            WHEN s.max_participants > 1 THEN 'capacity' ELSE 'direct' END,
            booking_capacity=GREATEST(1, s.max_participants) FROM business.businesses b WHERE b.id=s.business_id");
        Schema::create('catalog.resource_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained('catalog.services')->cascadeOnDelete();
            $table->foreignId('resource_id')->constrained('booking.resources')->cascadeOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['service_id', 'resource_id']);
        });
        DB::statement("INSERT INTO catalog.resource_services(service_id,resource_id,is_active,created_at,updated_at)
            SELECT s.id,r.id,TRUE,NOW(),NOW() FROM catalog.services s JOIN booking.resources r ON r.business_id=s.business_id
            WHERE s.booking_model='resource' AND r.is_active AND r.deleted_at IS NULL AND
            (NOT EXISTS(SELECT 1 FROM catalog.branch_services bs WHERE bs.service_id=s.id) OR
            EXISTS(SELECT 1 FROM catalog.branch_services bs WHERE bs.service_id=s.id AND bs.branch_id=r.branch_id AND bs.is_active))");
        Schema::table('booking.resources', fn (Blueprint $table) => $table->jsonb('attributes')->nullable());
        Schema::table('booking.appointments', function (Blueprint $table) {
            $table->integer('duration_minutes')->nullable();
            $table->integer('participants')->default(1);
            $table->string('booking_model', 30)->nullable();
        });
        Schema::table('booking.waitlists', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->constrained('business.business_branches')->nullOnDelete();
            $table->foreignId('resource_id')->nullable()->constrained('booking.resources')->nullOnDelete();
            $table->integer('duration_minutes')->nullable();
            $table->integer('participants')->default(1);
            $table->date('preferred_date_to')->nullable();
            $table->string('criteria_key', 64)->nullable();
            $table->index(['status', 'expires_at']);
        });
        Schema::table('booking.notification_deliveries', function (Blueprint $table) {
            $table->unsignedBigInteger('appointment_id')->nullable()->change();
            $table->foreignId('waitlist_id')->nullable()->constrained('booking.waitlists')->nullOnDelete();
        });
        DB::statement("ALTER TABLE catalog.services ADD CONSTRAINT service_booking_config_valid CHECK (
            (booking_model IS NULL OR booking_model IN ('professional','resource','direct','optional_professional','capacity'))
            AND duration_mode IN ('fixed','selectable') AND booking_capacity > 0 AND slot_interval_minutes > 0
            AND min_advance_minutes >= 0 AND (max_advance_days IS NULL OR max_advance_days > 0)
            AND cancellation_notice_minutes >= 0 AND reschedule_notice_minutes >= 0)");
        DB::statement('ALTER TABLE booking.appointments ADD CONSTRAINT appointment_participants_positive CHECK (participants > 0)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE catalog.services DROP CONSTRAINT IF EXISTS service_booking_config_valid');
        DB::statement('ALTER TABLE booking.appointments DROP CONSTRAINT IF EXISTS appointment_participants_positive');
        Schema::table('booking.notification_deliveries', fn (Blueprint $table) => $table->dropConstrainedForeignId('waitlist_id'));
        Schema::table('booking.waitlists', function (Blueprint $table) {
            $table->dropConstrainedForeignId('branch_id'); $table->dropConstrainedForeignId('resource_id');
            $table->dropIndex(['status', 'expires_at']);
            $table->dropColumn(['duration_minutes','participants','preferred_date_to','criteria_key']);
        });
        Schema::table('booking.appointments', fn (Blueprint $table) => $table->dropColumn(['duration_minutes','participants','booking_model']));
        Schema::table('booking.resources', fn (Blueprint $table) => $table->dropColumn('attributes'));
        Schema::dropIfExists('catalog.resource_services');
        Schema::table('catalog.services', fn (Blueprint $table) => $table->dropColumn(['booking_model','duration_mode','duration_options','booking_capacity','slot_interval_minutes','min_advance_minutes','max_advance_days','requires_confirmation','allow_cancellation','allow_reschedule','cancellation_notice_minutes','reschedule_notice_minutes','resource_professional_optional']));
    }
};
