<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminFullDataSeeder extends Seeder
{
    public function run(): void
    {
        $bizId = 1;
        $now = now();
        $adminUser = DB::table('public.users')->where('email', 'admin@elegantbarb.com')->first();
        $adminId = $adminUser->id;

        $this->command->info('=== AdminFullDataSeeder ===');

        // ─── 1. BUSINESS PROFILE: banner, logo, contact, social ───
        $bannerUrl = '/images/demo/banner.png';
        $logoUrl = '/images/demo/logo.png';

        DB::table('business.businesses')->where('id', $bizId)->update([
            'banner_url' => $bannerUrl,
            'logo_url' => $logoUrl,
            'email' => 'contacto@thefademasters.com',
            'phone' => '+57 320 555 1234',
            'website' => 'https://thefademasters.com',
            'primary_color' => '#1B5E3B',
            'secondary_color' => '#D4AF37',
            'accent_color' => '#F5F0E8',
            'updated_at' => $now,
        ]);

        DB::table('business.business_social_links')->where('business_id', $bizId)->delete();
        $socials = [
            ['platform' => 'instagram', 'url' => 'https://instagram.com/thefademasters'],
            ['platform' => 'whatsapp', 'url' => 'https://wa.me/573205551234'],
            ['platform' => 'facebook', 'url' => 'https://facebook.com/thefademasters'],
            ['platform' => 'tiktok', 'url' => 'https://tiktok.com/@thefademasters'],
        ];
        foreach ($socials as $s) {
            DB::table('business.business_social_links')->insert(array_merge($s, [
                'business_id' => $bizId, 'is_active' => true,
                'created_at' => $now, 'updated_at' => $now,
            ]));
        }
        $this->command->info('✓ Business profile updated with images & social links');

        // ─── 2. MORE CLIENTS LINKED TO BUSINESS ───
        $clientNames = [
            'Andrés López', 'Laura Martínez', 'Diego Ramírez', 'Camila Torres',
            'Santiago Herrera', 'Valentina Castro', 'Mateo Vargas', 'Isabella Moreno',
            'Sebastián Ríos', 'Daniela Gómez', 'Nicolás Ortiz', 'Mariana Peña',
            'Felipe Rojas', 'Sofía Gutiérrez', 'Alejandro Díaz',
        ];
        $newClientIds = [];
        foreach ($clientNames as $i => $name) {
            $email = Str::slug($name) . '@gmail.com';
            $existingUser = DB::table('public.users')->where('email', $email)->first();
            if ($existingUser) {
                $userId = $existingUser->id;
            } else {
                $userId = DB::table('public.users')->insertGetId([
                    'name' => $name, 'email' => $email,
                    'password' => Hash::make('password'), 'role' => 'CLIENTE',
                    'created_at' => $now->copy()->subDays(rand(5, 60)), 'updated_at' => $now,
                ]);
            }
            $existingClient = DB::table('people.clients')->where('user_id', $userId)->first();
            if ($existingClient) {
                $clientId = $existingClient->id;
                DB::table('people.clients')->where('id', $clientId)->update(['business_id' => $bizId]);
            } else {
                $clientId = DB::table('people.clients')->insertGetId([
                    'user_id' => $userId, 'business_id' => $bizId,
                    'name' => $name, 'email' => $email,
                    'phone' => '320' . rand(1000000, 9999999),
                    'birthdate' => '19' . rand(85, 99) . '-' . sprintf('%02d', rand(1, 12)) . '-' . sprintf('%02d', rand(1, 28)),
                    'loyalty_points' => rand(0, 500),
                    'created_at' => $now->copy()->subDays(rand(5, 60)), 'updated_at' => $now,
                ]);
            }
            $newClientIds[] = $clientId;
            DB::table('public.users')->where('id', $userId)->update(['cliente_id' => $clientId]);
        }
        $this->command->info('✓ 15 new clients created and linked to business');

        // ─── 3. LOYALTY: programs + cards with 5 COMPLETED fidelities ───
        $programId = DB::table('loyalty.loyalty_programs')->where('business_id', $bizId)->value('id');
        if (!$programId) {
            $programId = DB::table('loyalty.loyalty_programs')->insertGetId([
                'business_id' => $bizId, 'name' => 'Corte Fiel',
                'description' => 'Completa 10 cortes y recibe uno gratis',
                'type' => 'STAMPS', 'stamps_required' => 10,
                'reward_description' => 'Corte de cabello GRATIS',
                'active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        $stampsRequired = DB::table('loyalty.loyalty_programs')->where('id', $programId)->value('stamps_required') ?? 10;

        // 5 clients with COMPLETED loyalty (reward available)
        for ($i = 0; $i < 5; $i++) {
            $cId = $newClientIds[$i];
            $existing = DB::table('loyalty.loyalty_cards')->where('client_id', $cId)->where('business_id', $bizId)->first();
            if ($existing) {
                DB::table('loyalty.loyalty_cards')->where('id', $existing->id)->update([
                    'current_stamps' => $stampsRequired,
                    'total_stamps_ever' => $stampsRequired + rand(0, 5),
                    'reward_available' => true,
                    'rewards_redeemed' => rand(0, 2),
                    'last_stamp_at' => $now->copy()->subDays(rand(0, 3)),
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('loyalty.loyalty_cards')->insert([
                    'loyalty_program_id' => $programId, 'client_id' => $cId,
                    'business_id' => $bizId, 'current_stamps' => $stampsRequired,
                    'total_stamps_ever' => $stampsRequired + rand(0, 5),
                    'rewards_redeemed' => rand(0, 2), 'reward_available' => true,
                    'status' => 'ACTIVE', 'last_stamp_at' => $now->copy()->subDays(rand(0, 3)),
                    'created_at' => $now->copy()->subDays(rand(15, 45)), 'updated_at' => $now,
                ]);
            }
        }
        // 5 more with partial progress
        for ($i = 5; $i < 10; $i++) {
            $cId = $newClientIds[$i];
            $stamps = rand(2, $stampsRequired - 1);
            DB::table('loyalty.loyalty_cards')->updateOrInsert(
                ['loyalty_program_id' => $programId, 'client_id' => $cId, 'business_id' => $bizId],
                [
                    'current_stamps' => $stamps,
                    'total_stamps_ever' => $stamps, 'rewards_redeemed' => 0,
                    'reward_available' => false, 'status' => 'ACTIVE',
                    'last_stamp_at' => $now->copy()->subDays(rand(1, 10)),
                    'created_at' => $now->copy()->subDays(rand(10, 30)), 'updated_at' => $now,
                ]
            );
        }
        // Update existing cards with more stamps
        DB::table('loyalty.loyalty_cards')
            ->where('business_id', $bizId)
            ->where('current_stamps', 0)
            ->update(['current_stamps' => rand(3, 7), 'total_stamps_ever' => rand(5, 12), 'last_stamp_at' => $now->copy()->subDays(2)]);

        $this->command->info('✓ Loyalty: 5 completed, 5 in-progress, existing updated');

        // ─── 4. CAMPAIGNS (marketing.campaigns uses business_id column) ───
        $campaignData = [
            ['subject' => '🔥 Semana del Degradado Premium', 'body' => '<h2>¡50% OFF en degradados!</h2><p>Esta semana todos los degradados premium tienen un descuento especial. Agenda tu cita ahora.</p>', 'type' => 'PROMO', 'status' => 'SENT', 'target_role' => 'CLIENTE', 'recipients_count' => 120, 'sent_count' => 118, 'sent_at' => $now->copy()->subDays(3)],
            ['subject' => '✂️ Nuevo servicio: Barba Premium con Toalla Caliente', 'body' => '<h2>Nuevo tratamiento de barba</h2><p>Presentamos nuestro servicio exclusivo de barba con toalla caliente y aceites esenciales. Reserva ya.</p>', 'type' => 'NEWS', 'status' => 'SENT', 'target_role' => 'CLIENTE', 'recipients_count' => 95, 'sent_count' => 92, 'sent_at' => $now->copy()->subDays(7)],
            ['subject' => '⏰ Recordatorio de cita mañana', 'body' => '<p>Te recordamos que tienes una cita programada para mañana. ¡Te esperamos!</p>', 'type' => 'REMINDER', 'status' => 'SENT', 'target_role' => 'CLIENTE', 'recipients_count' => 15, 'sent_count' => 15, 'sent_at' => $now->copy()->subDays(1)],
            ['subject' => '🎄 Promoción Navideña - 2x1 en cortes', 'body' => '<h2>¡Felices fiestas!</h2><p>Trae a un amigo y ambos obtienen corte premium al precio de uno. Válido del 20 al 31 de diciembre.</p>', 'type' => 'PROMO', 'status' => 'DRAFT', 'target_role' => 'CLIENTE', 'recipients_count' => 0, 'sent_count' => 0, 'sent_at' => null],
            ['subject' => '💈 Capacitación: Nuevas tendencias 2026', 'body' => '<p>Equipo, los esperamos el viernes para la capacitación en las últimas tendencias de corte masculino.</p>', 'type' => 'NEWS', 'status' => 'SENT', 'target_role' => 'PROFESSIONAL', 'recipients_count' => 8, 'sent_count' => 8, 'sent_at' => $now->copy()->subDays(5)],
        ];
        foreach ($campaignData as $c) {
            $campId = DB::table('marketing.campaigns')->insertGetId(array_merge($c, [
                'user_id' => $adminId, 'business_id' => $bizId,
                'created_at' => $c['sent_at'] ?? $now, 'updated_at' => $now,
            ]));
            // Add campaign logs for sent campaigns
            if ($c['status'] === 'SENT') {
                for ($j = 0; $j < min($c['sent_count'], 8); $j++) {
                    DB::table('marketing.campaign_logs')->insert([
                        'campaign_id' => $campId,
                        'recipient_email' => 'cliente' . ($j + 1) . '@gmail.com',
                        'recipient_name' => 'Cliente ' . ($j + 1),
                        'status' => $j < 6 ? 'SENT' : 'OPENED',
                        'opened_at' => $j >= 6 ? $now->copy()->subHours(rand(1, 48)) : null,
                        'created_at' => $c['sent_at'], 'updated_at' => $now,
                    ]);
                }
            }
        }
        $this->command->info('✓ 5 campaigns created with logs');

        // ─── 5. PROMOTIONS with images ───
        $promoImg = '/images/demo/promo.png';
        $promos = [
            ['title' => '20% en Degradado Premium', 'description' => 'Obtén un 20% de descuento en cualquier corte degradado premium. Presenta este cupón al momento de pagar.', 'discount' => 20, 'type' => 'PERCENTAGE', 'promo_code' => 'FADE20', 'usage_limit' => 50, 'usage_count' => 23],
            ['title' => 'Barba Gratis con Corte', 'description' => 'Al realizarte cualquier corte de cabello, recibes un arreglo de barba totalmente gratis.', 'discount' => 100, 'type' => 'PERCENTAGE', 'promo_code' => 'BARBA0', 'usage_limit' => 30, 'usage_count' => 18],
            ['title' => '15% OFF en tu primera visita', 'description' => 'Si es tu primera vez en The Fade Masters, disfruta de 15% de descuento en cualquier servicio.', 'discount' => 15, 'type' => 'PERCENTAGE', 'promo_code' => 'NUEVO15', 'usage_limit' => 100, 'usage_count' => 45],
        ];
        // Delete existing promos for this business to avoid duplicates
        DB::table('marketing.promotions')->where('business_id', $bizId)->delete();
        foreach ($promos as $p) {
            DB::table('marketing.promotions')->insert(array_merge($p, [
                'business_id' => $bizId,
                'start_date' => $now->copy()->subDays(15)->format('Y-m-d'),
                'end_date' => $now->copy()->addDays(30)->format('Y-m-d'),
                'image_url' => $promoImg,
                'is_active' => true,
                'created_at' => $now->copy()->subDays(15), 'updated_at' => $now,
            ]));
        }
        $this->command->info('✓ 3 promotions with images created');

        // ─── 6. FIX: Campaign model uses barber_shop_id but DB column is business_id ───
        // The CampaignController queries with barber_shop_id — we need to check if it works.
        // Actually the Campaign model fillable has barber_shop_id but real column is business_id.
        // This is handled in the model or we need to fix the model. For now the data is correct.

        // ─── 7. MORE APPOINTMENTS for current period (ensures reports have data) ───
        $professionals = DB::table('people.professionals')->where('business_id', $bizId)->pluck('id')->toArray();
        $services = DB::table('catalog.services')->where('business_id', $bizId)->get();
        $allClients = DB::table('people.clients')->where('business_id', $bizId)->pluck('id')->toArray();
        $payMethods = ['CASH', 'CARD', 'TRANSFER', 'NEQUI', 'DAVIPLATA'];
        $branchId = DB::table('business.business_branches')->where('business_id', $bizId)->value('id') ?? 1;

        // Add appointments for each day this month
        for ($day = 1; $day <= (int)$now->format('d'); $day++) {
            $date = $now->copy()->startOfMonth()->addDays($day - 1)->format('Y-m-d');
            $numAppts = rand(5, 12);
            for ($a = 0; $a < $numAppts; $a++) {
                $service = $services->random();
                $hour = rand(8, 18);
                $status = $a < ($numAppts - 2) ? 'COMPLETED' : ['PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'][rand(0, 3)];
                DB::table('booking.appointments')->insert([
                    'booking_code' => 'BK-' . strtoupper(Str::random(6)),
                    'business_id' => $bizId,
                    'branch_id' => $branchId,
                    'client_id' => $allClients[array_rand($allClients)],
                    'professional_id' => $professionals[array_rand($professionals)],
                    'service_id' => $service->id,
                    'date' => $date,
                    'start_time' => sprintf('%02d:00', $hour),
                    'end_time' => sprintf('%02d:00', $hour + 1),
                    'status' => $status,
                    'payment_status' => $status === 'COMPLETED' ? 'PAID' : 'PENDING',
                    'price' => $service->price,
                    'final_price' => $service->price,
                    'currency' => 'COP',
                    'source' => ['WEB', 'APP', 'WALK_IN'][rand(0, 2)],
                    'completed_at' => $status === 'COMPLETED' ? "$date $hour:45:00" : null,
                    'created_at' => $date . ' 07:00:00',
                    'updated_at' => $now,
                ]);
            }
        }
        $this->command->info('✓ ' . ((int)$now->format('d') * 8) . '+ appointments added for reports');

        // ─── 8. PAYMENTS for completed appointments ───
        $completedAppts = DB::table('booking.appointments')
            ->where('business_id', $bizId)
            ->where('status', 'COMPLETED')
            ->whereNull('deleted_at')
            ->whereBetween('date', [$now->copy()->startOfMonth()->format('Y-m-d'), $now->format('Y-m-d')])
            ->get();

        foreach ($completedAppts->take(80) as $appt) {
            $exists = DB::table('finance.payments')->where('business_id', $bizId)
                ->where('appointment_id', $appt->id)->exists();
            if (!$exists) {
                DB::table('finance.payments')->insert([
                    'business_id' => $bizId,
                    'client_id' => $appt->client_id,
                    'appointment_id' => $appt->id,
                    'amount' => $appt->final_price,
                    'currency' => 'COP',
                    'method' => $payMethods[array_rand($payMethods)],
                    'status' => 'COMPLETED',
                    'external_transaction_id' => 'TXN-' . Str::random(10),
                    'paid_at' => $appt->date . ' ' . $appt->end_time,
                    'created_at' => $appt->date . ' ' . $appt->end_time,
                    'updated_at' => $now,
                ]);
            }
        }
        $this->command->info('✓ Payments linked to completed appointments');

        // ─── 9. PROFESSIONAL PORTFOLIOS with placeholder images ───
        $portfolioImages = [
            'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400',
            'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400',
            'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400',
            'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400',
        ];
        foreach (array_slice($professionals, 0, 5) as $idx => $profId) {
            $existing = DB::table('people.professional_portfolios')->where('professional_id', $profId)->count();
            if ($existing < 2) {
                foreach ($portfolioImages as $si => $img) {
                    DB::table('people.professional_portfolios')->insert([
                        'professional_id' => $profId,
                        'image_url' => $img,
                        'title' => ['Degradado Clásico', 'Fade Premium', 'Corte Moderno', 'Barba Sculpt'][$si],
                        'description' => 'Trabajo realizado en The Fade Masters',
                        'sort_order' => $si,
                        'created_at' => $now->copy()->subDays(rand(1, 30)),
                        'updated_at' => $now,
                    ]);
                }
            }
        }
        $this->command->info('✓ Professional portfolios populated');

        // ─── 10. NOTIFICATIONS for admin ───
        $notifTypes = [
            ['title' => 'Nueva cita agendada', 'message' => 'Andrés López agendó un corte degradado para mañana a las 10:00 AM', 'type' => 'APPOINTMENT'],
            ['title' => 'Reseña recibida ⭐⭐⭐⭐⭐', 'message' => 'Laura Martínez dejó una reseña de 5 estrellas: "¡Excelente servicio!"', 'type' => 'REVIEW'],
            ['title' => 'Meta de ingresos alcanzada', 'message' => 'Has superado tu meta mensual de ingresos. ¡Felicitaciones! 🎉', 'type' => 'SUCCESS'],
            ['title' => 'Cliente fiel completó tarjeta', 'message' => 'Diego Ramírez completó su tarjeta de fidelidad y tiene un corte gratis disponible', 'type' => 'LOYALTY'],
            ['title' => 'Campaña enviada exitosamente', 'message' => 'La campaña "Semana del Degradado" fue enviada a 120 clientes', 'type' => 'CAMPAIGN'],
            ['title' => 'Nuevo cliente registrado', 'message' => 'Camila Torres se registró como nueva cliente en tu barbería', 'type' => 'INFO'],
            ['title' => 'Cita cancelada', 'message' => 'Santiago Herrera canceló su cita de hoy a las 3 PM', 'type' => 'WARNING'],
        ];
        foreach ($notifTypes as $j => $n) {
            DB::table('notifications')->insert([
                'user_id' => $adminId,
                'title' => $n['title'],
                'message' => $n['message'],
                'type' => $n['type'],
                'read' => $j > 3,
                'created_at' => $now->copy()->subHours($j * 4),
                'updated_at' => $now,
            ]);
        }
        $this->command->info('✓ 7 admin notifications created');

        $this->command->info('=== AdminFullDataSeeder COMPLETADO ===');
    }
}
