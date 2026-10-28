<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NotificationDemoSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $users = DB::table('public.users')->whereIn('email', [
            'superadmin@elegantbarb.com',
            'admin@elegantbarb.com',
            'professional@elegantbarb.com',
            'cliente@elegantbarb.com',
            'maria@elegantbarb.com',
        ])->pluck('id', 'email')->toArray();

        $types = [
            'GENERAL',
            'APPOINTMENT',
            'PROMOTION',
            'SYSTEM',
        ];

        $titles = [
            'Recordatorio de cita',
            'Cita confirmada',
            'Nueva promoción disponible',
            'Actualización del sistema',
        ];

        foreach ($users as $email => $userId) {
            for ($i = 0; $i < 5; $i++) {
                $idx = array_rand($types);
                DB::table('notifications')->insert([
                    'user_id' => $userId,
                    'type' => $types[$idx],
                    'title' => $titles[$idx],
                    'message' => 'Notificación demo ' . ($i + 1) . ' para ' . $email,
                    'read' => $i < 2,
                    'created_at' => $now->copy()->subDays(rand(0, 7))->subHours(rand(0, 23)),
                    'updated_at' => $now,
                ]);
            }
        }

        $this->command->info('NotificationDemoSeeder: ' . (count($users) * 5) . ' notificaciones creadas.');
    }
}
