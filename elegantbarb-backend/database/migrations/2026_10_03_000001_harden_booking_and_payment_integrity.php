<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finance.payments', function (Blueprint $table) {
            $table->string('external_reference')->nullable()->index();
            $table->string('preference_id')->nullable();
        });
        // Partial composite indexes support the actual overlap and idempotency queries.
        DB::statement("CREATE INDEX booking_professional_overlap_idx ON booking.appointments (professional_id, date, start_time, end_time) WHERE deleted_at IS NULL AND status IN ('PENDING', 'CONFIRMED', 'RESCHEDULED')");
        DB::statement("CREATE INDEX booking_resource_overlap_idx ON booking.appointments (resource_id, date, start_time, end_time) WHERE deleted_at IS NULL AND status IN ('PENDING', 'CONFIRMED', 'RESCHEDULED')");
        DB::statement('CREATE INDEX wallet_reference_lookup_idx ON finance.wallet_transactions (wallet_id, external_reference) WHERE external_reference IS NOT NULL');
        // NOT VALID preserves existing data while enforcing constraints on new writes.
        DB::statement('ALTER TABLE finance.wallets ADD CONSTRAINT wallet_nonnegative_balance CHECK (balance >= 0 AND hold_balance >= 0 AND hold_balance <= balance) NOT VALID');
        DB::statement('ALTER TABLE booking.appointments ADD CONSTRAINT appointment_positive_interval CHECK (end_time > start_time AND price >= 0 AND final_price >= 0 AND discount_amount >= 0) NOT VALID');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE booking.appointments DROP CONSTRAINT IF EXISTS appointment_positive_interval');
        DB::statement('ALTER TABLE finance.wallets DROP CONSTRAINT IF EXISTS wallet_nonnegative_balance');
        DB::statement('DROP INDEX IF EXISTS finance.wallet_reference_lookup_idx');
        DB::statement('DROP INDEX IF EXISTS booking.booking_resource_overlap_idx');
        DB::statement('DROP INDEX IF EXISTS booking.booking_professional_overlap_idx');
        Schema::table('finance.payments', fn (Blueprint $table) => $table->dropColumn(['external_reference', 'preference_id']));
    }
};
