<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DemoFlowsSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $users = [
            'superadmin' => DB::table('public.users')->where('email', 'superadmin@elegantbarb.com')->first(),
            'admin' => DB::table('public.users')->where('email', 'admin@elegantbarb.com')->first(),
            'professional' => DB::table('public.users')->where('email', 'professional@elegantbarb.com')->first(),
            'client' => DB::table('public.users')->where('email', 'cliente@elegantbarb.com')->first(),
            'client2' => DB::table('public.users')->where('email', 'maria@elegantbarb.com')->first(),
        ];

        $businessId = DB::table('business.businesses')->where('slug', 'the-fade-masters')->value('id')
            ?: DB::table('business.businesses')->value('id');
        if (! $businessId) {
            $this->command->warn('DemoFlowsSeeder: no hay negocios.');
            return;
        }

        $branchId = DB::table('business.business_branches')
            ->where('business_id', $businessId)
            ->where('is_main_branch', true)
            ->value('id')
            ?: DB::table('business.business_branches')->where('business_id', $businessId)->value('id');

        if (! $branchId) {
            $branchId = DB::table('business.business_branches')->insertGetId([
                'business_id' => $businessId,
                'name' => 'Sede Principal',
                'address' => 'Carrera 15 # 45-30, Pereira',
                'is_main_branch' => true,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        if ($users['admin']) {
            DB::table('business.businesses')->where('id', $businessId)->update([
                'owner_user_id' => $users['admin']->id,
                'updated_at' => $now,
            ]);
            DB::table('public.users')->where('id', $users['admin']->id)->update([
                'barber_shop_id' => $businessId,
                'updated_at' => $now,
            ]);
        }

        $professionalId = $this->ensureProfessional($users['professional'], $businessId, $branchId, $now);
        $clientId = $this->ensureClient($users['client'], $businessId, 'Juan Pérez', 450, $now);
        $client2Id = $this->ensureClient($users['client2'], $businessId, 'María García', 180, $now);

        $this->assignRole($users['superadmin']?->id, 'superadmin', $now);
        $this->assignRole($users['admin']?->id, 'admin', $now);
        $this->assignRole($users['professional']?->id, 'professional', $now);
        $this->assignRole($users['client']?->id, 'client', $now);
        $this->assignRole($users['client2']?->id, 'client', $now);

        $serviceIds = DB::table('catalog.services')
            ->where('business_id', $businessId)
            ->where('is_active', true)
            ->pluck('id')
            ->toArray();

        if (empty($serviceIds)) {
            $serviceIds[] = DB::table('catalog.services')->insertGetId([
                'business_id' => $businessId,
                'name' => 'Corte Clásico',
                'description' => 'Servicio demo para flujo completo',
                'price' => 25000,
                'duration_minutes' => 30,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        foreach ($serviceIds as $serviceId) {
            DB::table('catalog.branch_services')->updateOrInsert(
                ['branch_id' => $branchId, 'service_id' => $serviceId],
                ['is_active' => true, 'updated_at' => $now, 'created_at' => $now]
            );

            if ($professionalId) {
                DB::table('catalog.professional_services')->updateOrInsert(
                    ['professional_id' => $professionalId, 'service_id' => $serviceId, 'branch_id' => $branchId],
                    ['commission_percentage' => 50, 'is_active' => true, 'updated_at' => $now, 'created_at' => $now]
                );
            }
        }

        DB::table('booking.appointments')->where('notes', 'like', 'Demo flow:%')->delete();

        foreach ([$clientId, $client2Id] as $idx => $demoClientId) {
            if (! $demoClientId || ! $professionalId) continue;
            $this->seedAppointments($businessId, $branchId, $demoClientId, $professionalId, $serviceIds, $idx, $now);

            DB::table('people.favorite_businesses')->updateOrInsert(
                ['client_id' => $demoClientId, 'business_id' => $businessId],
                ['created_at' => $now, 'updated_at' => $now]
            );
            DB::table('people.favorite_professionals')->updateOrInsert(
                ['client_id' => $demoClientId, 'professional_id' => $professionalId],
                ['created_at' => $now, 'updated_at' => $now]
            );
        }

        $this->command->info('Demo flows listos: usuarios, roles, favoritos y citas por rol.');
    }

    private function ensureProfessional($user, int $businessId, int $branchId, $now): ?int
    {
        if (! $user) return null;

        DB::table('people.professionals')->updateOrInsert(
            ['user_id' => $user->id],
            [
                'business_id' => $businessId,
                'name' => 'Carlos Mendoza',
                'email' => $user->email,
                'phone' => '3205553333',
                'specialty' => 'Degradados y barba',
                'bio' => 'Profesional demo para validar agenda, on-demand y ganancias.',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        $professionalId = DB::table('people.professionals')->where('user_id', $user->id)->value('id');
        DB::table('public.users')->where('id', $user->id)->update(['barber_id' => $professionalId, 'updated_at' => $now]);

        foreach (range(0, 6) as $day) {
            DB::table('people.professional_availability')->updateOrInsert(
                ['professional_id' => $professionalId, 'branch_id' => $branchId, 'day_of_week' => $day],
                ['start_time' => '08:00:00', 'end_time' => '20:00:00', 'is_available' => true, 'created_at' => $now, 'updated_at' => $now]
            );
        }

        return $professionalId;
    }

    private function ensureClient($user, int $businessId, string $name, int $points, $now): ?int
    {
        if (! $user) return null;

        DB::table('people.clients')->updateOrInsert(
            ['user_id' => $user->id],
            [
                'business_id' => $businessId,
                'name' => $name,
                'email' => $user->email,
                'phone' => $name === 'Juan Pérez' ? '3205551111' : '3205552222',
                'birthdate' => $name === 'Juan Pérez' ? '1995-06-15' : '1992-03-20',
                'loyalty_points' => $points,
                'xp_points' => $points * 2,
                'tier' => $points >= 400 ? 'GOLD' : 'SILVER',
                'is_vip' => $points >= 400,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        $clientId = DB::table('people.clients')->where('user_id', $user->id)->value('id');
        DB::table('public.users')->where('id', $user->id)->update(['cliente_id' => $clientId, 'updated_at' => $now]);

        return $clientId;
    }

    private function assignRole(?int $userId, string $slug, $now): void
    {
        if (! $userId) return;
        $roleId = DB::table('roles')->where('slug', $slug)->value('id');
        if (! $roleId) return;

        DB::table('user_roles')->where('user_id', $userId)->delete();
        DB::table('user_roles')->insert([
            'user_id' => $userId,
            'role_id' => $roleId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function seedAppointments(int $businessId, int $branchId, int $clientId, int $professionalId, array $serviceIds, int $offset, $now): void
    {
        $samples = [
            ['days' => 1 + $offset, 'time' => '10:00:00', 'status' => 'CONFIRMED', 'payment' => 'PENDING'],
            ['days' => 4 + $offset, 'time' => '15:30:00', 'status' => 'PENDING', 'payment' => 'PAY_AT_LOCATION'],
            ['days' => -8 - $offset, 'time' => '11:00:00', 'status' => 'COMPLETED', 'payment' => 'PAID'],
            ['days' => -15 - $offset, 'time' => '16:00:00', 'status' => 'CANCELLED', 'payment' => 'REFUNDED'],
        ];

        foreach ($samples as $sample) {
            $serviceId = $serviceIds[array_rand($serviceIds)];
            $service = DB::table('catalog.services')->where('id', $serviceId)->first();
            $price = $service?->price ?? 25000;
            $start = now()->addDays($sample['days'])->setTimeFromTimeString($sample['time']);

            DB::table('booking.appointments')->insert([
                'booking_code' => 'FLOW-' . strtoupper(Str::random(8)),
                'business_id' => $businessId,
                'branch_id' => $branchId,
                'client_id' => $clientId,
                'professional_id' => $professionalId,
                'service_id' => $serviceId,
                'resource_id' => null,
                'date' => $start->toDateString(),
                'start_time' => $start->format('H:i:s'),
                'end_time' => $start->copy()->addMinutes($service?->duration_minutes ?? 30)->format('H:i:s'),
                'status' => $sample['status'],
                'payment_status' => $sample['payment'],
                'price' => $price,
                'discount_amount' => 0,
                'final_price' => $price,
                'currency' => 'COP',
                'notes' => 'Demo flow: ' . $sample['status'],
                'source' => 'web',
                'completed_at' => $sample['status'] === 'COMPLETED' ? $start->copy()->addMinutes($service?->duration_minutes ?? 30) : null,
                'cancelled_at' => $sample['status'] === 'CANCELLED' ? $start : null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
