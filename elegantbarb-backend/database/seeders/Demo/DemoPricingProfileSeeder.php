<?php

namespace Database\Seeders\Demo;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\DynamicPricingRule;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use Illuminate\Database\Seeder;

final class DemoPricingProfileSeeder extends Seeder
{
    public function run(): void
    {
        $business = Business::where('slug', DemoData::BUSINESS_SLUG)->first();
        $service = $business?->services()->where('is_active', true)->orderBy('id')->first();
        if ($business && $service) DynamicPricingRule::firstOrCreate(['business_id' => $business->id, 'service_id' => $service->id, 'priority' => 9102], [
            'name' => 'DEMO · mañanas entre semana', 'rule_type' => 'PEAK_HOUR', 'conditions' => ['days_of_week' => [1, 2, 3, 4, 5], 'time_start' => '09:00', 'time_end' => '12:00'],
            'multiplier' => 0.90, 'flat_adjustment' => 0, 'is_active' => true, 'timezone' => config('booking.timezone'),
        ]);
        foreach ([DemoData::SUPERADMIN_EMAIL, DemoData::ADMIN_EMAIL, DemoData::PROFESSIONAL_EMAIL, DemoData::CLIENT_EMAIL] as $email) {
            $user = User::where('email', $email)->first();
            if (! $user) continue;
            if ($user->phone === null) $user->phone = Client::where('user_id', $user->id)->whereNotNull('phone')->value('phone') ?? Professional::where('user_id', $user->id)->whereNotNull('phone')->value('phone');
            if ($user->preferences === null) $user->preferences = ['language' => 'es', 'theme' => 'system', 'appointment_reminders' => true, 'email_notifications' => false];
            $user->save();
        }
    }
}
