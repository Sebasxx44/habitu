<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
use Faker\Factory as Faker;

class MassiveDataSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_CO');
        $now = now();

        $this->command->info('========================================');
        $this->command->info('  MASSIVE DATA SEEDER — Miles de registros');
        $this->command->info('========================================');

        // ─── 1. USUARIOS MASIVOS ─────────────────────
        $this->command->info('→ Creando usuarios masivos...');

        $businesses = DB::table('business.businesses')->get();
        if ($businesses->isEmpty()) { $this->command->warn('No businesses found, skipping users.'); return; }

        $allUsers = [];
        $existingEmails = DB::table('public.users')->pluck('email')->toArray();

        $createUser = function ($name, $email, $role, $businessId = null) use ($faker, $now, &$existingEmails, &$allUsers) {
            if (in_array($email, $existingEmails)) return null;
            $existingEmails[] = $email;
            $id = DB::table('public.users')->insertGetId([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make('password'),
                'role' => $role,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $allUsers[] = ['id' => $id, 'role' => $role, 'business_id' => $businessId, 'name' => $name, 'email' => $email];
            return $id;
        };

        // 5 admins extra
        for ($i = 0; $i < 5; $i++) {
            $biz = $businesses[array_rand($businesses->toArray())];
            $createUser($faker->name, "admin{$i}@habitu.co", 'ADMIN_BARBERIA', $biz->id);
        }

        // 200 PROFESSIONALES
        $professionals = [];
        for ($i = 0; $i < 200; $i++) {
            $biz = $businesses[array_rand($businesses->toArray())];
            $name = $faker->firstName . ' ' . $faker->lastName;
            $email = "pro{$i}@habitu.co";
            $uid = $createUser($name, $email, 'PROFESSIONAL', $biz->id);
            if ($uid) {
                $specialties = ['Degradados', 'Barba', 'Colorimetría', 'Corte Clásico', 'Tatuaje Realista', 'Blackwork', 'Uñas Acrílicas', 'Masajes', 'Faciales', 'Entrenamiento Funcional', 'Yoga', 'CrossFit'];
                $professionals[] = [
                    'user_id' => $uid,
                    'business_id' => $biz->id,
                    'name' => $name,
                    'specialty' => $specialties[array_rand($specialties)],
                    'bio' => $faker->sentence(12),
                    'is_active' => $faker->boolean(85),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }
        DB::table('people.professionals')->insert($professionals);
        $profIds = DB::table('people.professionals')->pluck('id')->toArray();

        // 300 CLIENTES
        $clients = [];
        for ($i = 0; $i < 300; $i++) {
            $name = $faker->firstName . ' ' . $faker->lastName;
            $email = "cliente{$i}@habitu.co";
            $uid = $createUser($name, $email, 'CLIENTE');
            if ($uid) {
                $clients[] = [
                    'user_id' => $uid,
                    'name' => $name,
                    'email' => $email,
                    'phone' => $faker->phoneNumber,
                    'birthdate' => $faker->date('Y-m-d', '-30 years'),
                    'loyalty_points' => rand(0, 5000),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }
        DB::table('people.clients')->insert($clients);
        $clientIds = DB::table('people.clients')->pluck('id')->toArray();

        $this->command->info('   ✓ ' . count($allUsers) . ' usuarios creados');

        // Pre-cache branches
        $branches = DB::table('business.business_branches')->get();
        $branchMap = [];
        foreach ($branches as $br) {
            $branchMap[$br->business_id][] = $br->id;
        }

        // ─── 2. CITAS MASIVAS ─────────────────────
        $this->command->info('→ Creando citas masivas...');
        $services = DB::table('catalog.services')->get();
        if ($services->isEmpty()) {
            DB::table('catalog.services')->insert(array_map(fn($n) => [
                'business_id' => $businesses->first()->id,
                'name' => $n,
                'description' => $faker->sentence,
                'base_price' => rand(15000, 120000),
                'duration_minutes' => rand(15, 120),
                'is_active' => true,
                'created_at' => $now, 'updated_at' => $now,
            ], ['Corte Moderno', 'Corte + Barba', 'Degradado Premium', 'Afeitado Clásico', 'Tatuaje Pequeño', 'Tatuaje Medio', 'Manicure', 'Pedicure', 'Masaje Relajante', 'Entrenamiento Personal']));
            $services = DB::table('catalog.services')->get();
        }

        $statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED', 'CONFIRMED'];
        $payMethods = ['CASH', 'CARD', 'WALLET', 'MERCADOPAGO'];

        $allAppointments = [];
        $batchSize = 500;
        $totalAppts = 0;
        $chunk = [];

        for ($day = 0; $day < 90; $day++) {
            $date = Carbon::now()->subDays(90 - $day)->toDateString();
            $count = $day < 30 ? rand(10, 20) : ($day < 60 ? rand(15, 30) : rand(20, 40));

            for ($j = 0; $j < $count; $j++) {
                $svc = $services[array_rand($services->toArray())];
                $status = $statuses[array_rand($statuses)];
                $hour = rand(8, 19);
                $minute = [0, 15, 30, 45][array_rand([0, 15, 30, 45])];
                $time = sprintf('%02d:%02d:00', $hour, $minute);
                $basePrice = $svc->base_price ?? rand(15000, 80000);
                $finalPrice = $basePrice * (1 + rand(0, 30) / 100);

                $bizId = $businesses[array_rand($businesses->toArray())]->id;
                if (!isset($branchMap[$bizId])) continue;
                $branchId = $branchMap[$bizId][array_rand($branchMap[$bizId])];
                $chunk[] = [
                    'business_id' => $bizId,
                    'branch_id' => $branchId,
                    'professional_id' => count($profIds) > 0 ? $profIds[array_rand($profIds)] : null,
                    'client_id' => count($clientIds) > 0 ? $clientIds[array_rand($clientIds)] : null,
                    'service_id' => $svc->id,
                    'date' => $date,
                    'start_time' => $time,
                    'end_time' => Carbon::parse("{$date} {$time}")->addMinutes($svc->duration_minutes ?? 30)->format('H:i:s'),
                    'status' => $status,
                    'price' => $basePrice,
                    'final_price' => $finalPrice,
                    'payment_status' => $status === 'COMPLETED' ? 'PAID' : (in_array($status, ['CANCELLED', 'NO_SHOW']) ? 'PENDING' : 'PAID'),
                    'notes' => $faker->boolean(20) ? $faker->sentence : null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
                $allAppointments[] = end($chunk);
                $totalAppts++;

                if (count($chunk) >= $batchSize) {
                    DB::table('booking.appointments')->insert($chunk);
                    $chunk = [];
                }
            }
            if ($day % 10 === 0) $this->command->info("   ... día {$day}/90 ({$totalAppts} citas)");
        }
        if (!empty($chunk)) DB::table('booking.appointments')->insert($chunk);
        $this->command->info("   ✓ {$totalAppts} citas creadas");

        $completedAppts = DB::table('booking.appointments')->where('status', 'COMPLETED')->get();

        // ─── 3. RESEÑAS MASIVAS ─────────────────────
        $this->command->info('→ Creando reseñas...');
        $reviewsChunk = [];
        $totalReviews = 0;
        foreach ($completedAppts as $i => $appt) {
            if ($i % 3 !== 0) continue; // 1 de cada 3 citas tiene review
            $reviewsChunk[] = [
                'business_id' => $appt->business_id,
                'professional_id' => $appt->professional_id,
                'client_id' => $appt->client_id,
                'appointment_id' => $appt->id,
                'rating' => rand(3, 5),
                'comment' => $faker->boolean(70) ? $faker->sentence(rand(3, 10)) : null,
                'is_verified' => $faker->boolean(80),
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $totalReviews++;
            if (count($reviewsChunk) >= $batchSize) {
                DB::table('reviews.reviews')->insert($reviewsChunk);
                $reviewsChunk = [];
            }
        }
        if (!empty($reviewsChunk)) DB::table('reviews.reviews')->insert($reviewsChunk);
        $this->command->info("   ✓ {$totalReviews} reseñas creadas");

        // ─── 4. PAGOS MASIVOS ─────────────────────
        $this->command->info('→ Creando pagos...');
        $paymentsChunk = [];
        $totalPayments = 0;
        foreach ($completedAppts as $appt) {
            $amt = $appt->final_price ?? $appt->price ?? rand(15000, 80000);
            $paymentsChunk[] = [
                'business_id' => $appt->business_id,
                'client_id' => $appt->client_id,
                'appointment_id' => $appt->id,
                'amount' => $amt,
                'currency' => 'COP',
                'method' => $payMethods[array_rand($payMethods)],
                'status' => 'COMPLETED',
                'external_transaction_id' => 'PAY-' . strtoupper(substr(md5($appt->id . time()), 0, 10)),
                'paid_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $totalPayments++;
            if (count($paymentsChunk) >= $batchSize) {
                DB::table('finance.payments')->insert($paymentsChunk);
                $paymentsChunk = [];
            }
        }
        if (!empty($paymentsChunk)) DB::table('finance.payments')->insert($paymentsChunk);
        $this->command->info("   ✓ {$totalPayments} pagos creados");

        // ─── 5. WALLET TRANSACTIONS MASIVOS ────────
        $this->command->info('→ Creando wallet transactions...');
        $wallets = DB::table('finance.wallets')->get();
        $walletTxChunk = [];
        $totalWTx = 0;
        foreach ($wallets as $wallet) {
            $txCount = rand(3, 15);
            $balance = (float) $wallet->balance;
            for ($t = 0; $t < $txCount; $t++) {
                $type = ['TOPUP', 'TOPUP', 'PAYMENT', 'PAYMENT', 'PAYMENT', 'REFUND'][array_rand(range(0, 5))];
                $amt = $type === 'TOPUP' ? rand(20000, 200000) : rand(5000, 80000);
                $before = $balance;
                $after = $type === 'TOPUP' ? $balance + $amt : $balance - $amt;
                $balance = $after;
                $walletTxChunk[] = [
                    'wallet_id' => $wallet->id,
                    'user_id' => $wallet->user_id,
                    'type' => $type,
                    'amount' => $amt,
                    'balance_before' => $before,
                    'balance_after' => $after,
                    'status' => 'COMPLETED',
                    'external_reference' => $type . '-' . strtoupper(substr(md5(rand()), 0, 8)),
                    'description' => $type === 'TOPUP' ? 'Recarga de billetera' : 'Pago de servicio',
                    'created_at' => Carbon::now()->subDays(rand(0, 90)),
                    'updated_at' => $now,
                ];
                $totalWTx++;
                if (count($walletTxChunk) >= $batchSize) {
                    DB::table('finance.wallet_transactions')->insert($walletTxChunk);
                    $walletTxChunk = [];
                }
            }
        }
        if (!empty($walletTxChunk)) DB::table('finance.wallet_transactions')->insert($walletTxChunk);
        $this->command->info("   ✓ {$totalWTx} transacciones wallet creadas");

        // ─── 6. GAMIFICATION XP MASIVO ─────────────────
        $this->command->info('→ Creando XP records...');
        $allUserIds = array_column($allUsers, 'id');
        $xpChunk = [];
        $totalXP = 0;
        $actions = ['BOOK_APPOINTMENT', 'COMPLETE_APPOINTMENT', 'REVIEW', 'REFERRAL', 'STREAK'];
        $xpPoints = [10, 50, 25, 100, 75];
        foreach ($allUserIds as $uid) {
            $xpCount = rand(5, 40);
            for ($x = 0; $x < $xpCount; $x++) {
                $ai = array_rand($actions);
                $xpChunk[] = [
                    'user_id' => $uid,
                    'points' => $xpPoints[$ai],
                    'action' => $actions[$ai],
                    'description' => $actions[$ai] . ' reward',
                    'source_type' => 'App\Models\Appointment',
                    'source_id' => rand(1, 1000),
                    'created_at' => Carbon::now()->subDays(rand(0, 90)),
                    'updated_at' => $now,
                ];
                $totalXP++;
                if (count($xpChunk) >= $batchSize) {
                    DB::table('platform.gamification_xp')->insert($xpChunk);
                    $xpChunk = [];
                }
            }
        }
        if (!empty($xpChunk)) DB::table('platform.gamification_xp')->insert($xpChunk);
        $this->command->info("   ✓ {$totalXP} XP records creados");

        // ─── 7. AI CONVERSATIONS ─────────────────
        $this->command->info('→ Creando conversaciones AI...');
        $aiConvChunk = [];
        $totalAi = 0;
        foreach (array_slice($allUserIds, 0, 100) as $uid) {
            $convCount = rand(1, 3);
            for ($c = 0; $c < $convCount; $c++) {
                $sessionId = 'sess-' . substr(md5($uid . $c . time()), 0, 12);
                DB::table('platform.ai_conversations')->insert([
                    'user_id' => $uid,
                    'session_id' => $sessionId,
                    'context_type' => ['GENERAL', 'BOOKING', 'SUPPORT'][array_rand(['GENERAL', 'BOOKING', 'SUPPORT'])],
                    'status' => $faker->boolean(70) ? 'CLOSED' : 'ACTIVE',
                    'last_activity_at' => Carbon::now()->subDays(rand(0, 30)),
                    'created_at' => $now, 'updated_at' => $now,
                ]);
                $convId = DB::getPdo()->lastInsertId();

                $msgCount = rand(2, 8);
                for ($m = 0; $m < $msgCount; $m++) {
                    DB::table('platform.ai_messages')->insert([
                        'conversation_id' => $convId,
                        'role' => $m % 2 === 0 ? 'user' : 'assistant',
                        'content' => $faker->sentence(rand(3, 15)),
                        'metadata' => json_encode(['latency_ms' => rand(50, 500)]),
                        'created_at' => $now, 'updated_at' => $now,
                    ]);
                }
                $totalAi++;
            }
        }
        $this->command->info("   ✓ {$totalAi} conversaciones AI creadas");

        // ─── 8. BNPL APPLICATIONS ─────────────────
        $this->command->info('→ Creando aplicaciones BNPL...');
        $bnplTotal = 0;
        foreach (array_slice($completedAppts->toArray(), 0, 150) as $appt) {
            $appt = (object) $appt;
            if (!$appt->client_id || $faker->boolean(30)) continue;
            $appId = DB::table('finance.bnpl_applications')->insertGetId([
                'client_id' => $appt->client_id,
                'appointment_id' => $appt->id,
                'total_amount' => $appt->final_price ?? $appt->base_price ?? 50000,
                'installments_count' => [3, 6, 12][array_rand([3, 6, 12])],
                'interest_rate' => 0,
                'status' => ['ACTIVE', 'COMPLETED', 'PENDING'][array_rand(['ACTIVE', 'COMPLETED', 'PENDING'])],
                'provider' => 'INTERNAL',
                'created_at' => $now, 'updated_at' => $now,
            ]);
            $installCount = rand(3, 6);
            for ($inst = 1; $inst <= $installCount; $inst++) {
                DB::table('finance.bnpl_installments')->insert([
                    'bnpl_application_id' => $appId,
                    'installment_number' => $inst,
                    'amount' => round(($appt->final_price ?? 50000) / $installCount, 2),
                    'due_date' => Carbon::now()->addDays(15 * $inst),
                    'status' => $inst <= rand(1, $installCount) ? 'PAID' : 'PENDING',
                    'paid_date' => $inst <= rand(1, $installCount) ? Carbon::now()->subDays(rand(1, 60)) : null,
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            }
            $bnplTotal++;
        }
        $this->command->info("   ✓ {$bnplTotal} aplicaciones BNPL creadas");

        // ─── 9. PROMOTIONS REDEMPTIONS ─────────────────
        $this->command->info('→ Creando redenciones de promociones...');
        $promotions = DB::table('marketing.promotions')->get();
        $redemptionsTotal = 0;
        if (count($allUserIds) > 0 && $promotions->isNotEmpty()) {
            for ($i = 0; $i < 200; $i++) {
                DB::table('marketing.promotions')->where('id', $promotions->random()->id)->increment('usage_count');
                $redemptionsTotal++;
            }
        }
        $this->command->info("   ✓ {$redemptionsTotal} redenciones de promociones");

        // ─── 10. NOTIFICATIONS MASIVAS ─────────────────
        $this->command->info('→ Creando notificaciones...');
        $notifChunk = [];
        $totalNotif = 0;
        $types = ['APPOINTMENT_REMINDER', 'PROMOTION', 'REVIEW_REQUEST', 'SYSTEM', 'LOYALTY'];
        foreach ($allUserIds as $uid) {
            $nCount = rand(3, 10);
            for ($n = 0; $n < $nCount; $n++) {
                $notifChunk[] = [
                    'user_id' => $uid,
                    'type' => $types[array_rand($types)],
                    'title' => $faker->sentence(3),
                    'message' => $faker->sentence(8),
                    'read' => $faker->boolean(50),
                    'created_at' => Carbon::now()->subDays(rand(0, 60)),
                    'updated_at' => $now,
                ];
                $totalNotif++;
                if (count($notifChunk) >= $batchSize) {
                    DB::table('notifications')->insert($notifChunk);
                    $notifChunk = [];
                }
            }
        }
        if (!empty($notifChunk)) DB::table('notifications')->insert($notifChunk);
        $this->command->info("   ✓ {$totalNotif} notificaciones creadas");

        // ─── 11. RECOMMENDATION LOGS ─────────────────
        $this->command->info('→ Creando logs de recomendación...');
        $recChunk = [];
        $recTypes = ['PERSONALIZED', 'TRENDING', 'LOCATION', 'SIMILAR'];
        for ($i = 0; $i < 500; $i++) {
            $biz = $businesses->random();
            $recChunk[] = [
                'user_id' => $allUserIds[array_rand($allUserIds)],
                'recommendation_type' => $recTypes[array_rand($recTypes)],
                'recommendable_type' => 'App\Modules\Business\Models\Business',
                'recommendable_id' => $biz->id,
                'score' => round(rand(1, 100) / 10, 1),
                'algorithm' => 'HYBRID',
                'was_clicked' => $faker->boolean(40),
                'was_booked' => $faker->boolean(15),
                'created_at' => Carbon::now()->subDays(rand(0, 30)),
                'updated_at' => $now,
            ];
            if (count($recChunk) >= 200) {
                DB::table('platform.recommendation_logs')->insert($recChunk);
                $recChunk = [];
            }
        }
        if (!empty($recChunk)) DB::table('platform.recommendation_logs')->insert($recChunk);
        $this->command->info('   ✓ 500 logs de recomendación creados');

        // ─── 12. CHAT CONVERSATIONS ─────────────────
        $this->command->info('→ Creando conversaciones chat...');
        $chatTotal = 0;
        for ($i = 0; $i < 30; $i++) {
            $biz = $businesses->random();
            $convId = DB::table('chat.conversations')->insertGetId([
                'subject' => $faker->sentence(3),
                'type' => $faker->boolean(70) ? 'DIRECT' : 'GROUP',
                'business_id' => $biz->id,
                'is_active' => true,
                'last_message_at' => $now,
                'created_at' => $now, 'updated_at' => $now,
            ]);
            $addedUsers = [];
            $partCount = rand(2, 5);
            $attempts = 0;
            while (count($addedUsers) < $partCount && $attempts < 20) {
                $uid = $allUserIds[array_rand($allUserIds)];
                if (!in_array($uid, $addedUsers)) {
                    $addedUsers[] = $uid;
                    DB::table('chat.conversation_participants')->insert([
                        'conversation_id' => $convId,
                        'user_id' => $uid,
                        'created_at' => $now, 'updated_at' => $now,
                    ]);
                }
                $attempts++;
            }
            $msgCount = rand(3, 15);
            for ($m = 0; $m < $msgCount; $m++) {
                DB::table('chat.messages')->insert([
                    'conversation_id' => $convId,
                    'sender_id' => $addedUsers[array_rand($addedUsers)],
                    'content' => $faker->sentence(rand(3, 12)),
                    'message_type' => 'TEXT',
                    'created_at' => Carbon::now()->subMinutes(rand(1, 1440)),
                    'updated_at' => $now,
                ]);
            }
            $chatTotal++;
        }
        $this->command->info("   ✓ {$chatTotal} conversaciones chat creadas");

        // ─── 13. WAITLIST ENTRIES ─────────────────
        $this->command->info('→ Creando entradas waitlist...');
        $waitStatuses = ['PENDING', 'NOTIFIED', 'CONVERTED', 'EXPIRED', 'CANCELLED'];
        for ($i = 0; $i < 40; $i++) {
            $biz = $businesses->random();
            $hour = rand(8, 17);
            DB::table('booking.waitlists')->insert([
                'business_id' => $biz->id,
                'client_id' => count($clientIds) > 0 ? $clientIds[array_rand($clientIds)] : null,
                'service_id' => $services->random()->id,
                'preferred_date' => Carbon::now()->addDays(rand(1, 14))->toDateString(),
                'preferred_time_start' => sprintf('%02d:00:00', $hour),
                'preferred_time_end' => sprintf('%02d:00:00', $hour + 1),
                'status' => $waitStatuses[array_rand($waitStatuses)],
                'created_at' => Carbon::now()->subDays(rand(0, 30)),
                'updated_at' => $now,
            ]);
        }
        $this->command->info('   ✓ 40 waitlist entries creadas');

        // ─── 14. SMART QUEUE ENTRIES ─────────────────
        $this->command->info('→ Creando filas digitales...');
        $queues = DB::table('booking.smart_queues')->get();
        if ($queues->isNotEmpty()) {
            foreach ($queues as $queue) {
                $qTotal = rand(10, 30);
                for ($q = 0; $q < $qTotal; $q++) {
                    DB::table('booking.smart_queue_entries')->insert([
                        'queue_id' => $queue->id,
                        'client_id' => count($clientIds) > 0 ? $clientIds[array_rand($clientIds)] : null,
                        'ticket_number' => $q + 1,
                        'status' => $q < rand(3, $qTotal) ? 'COMPLETED' : (rand(0, 1) ? 'WAITING' : 'CALLED'),
                        'estimated_wait_minutes' => rand(5, 60),
                        'called_at' => $q < $qTotal - 3 ? Carbon::now()->subMinutes(rand(1, 30)) : null,
                        'served_at' => $q < $qTotal - 5 ? Carbon::now()->subMinutes(rand(1, 60)) : null,
                        'completed_at' => $q < $qTotal - 8 ? Carbon::now()->subMinutes(rand(1, 120)) : null,
                        'created_at' => $now, 'updated_at' => $now,
                    ]);
                }
            }
        }
        $this->command->info('   ✓ Filas digitales pobladas');

        // ─── 15. MEMBERSHIP SUBSCRIPTIONS ─────────────────
        $this->command->info('→ Creando membresías de clientes...');
        $membershipPlans = DB::table('subscriptions.membership_plans')->get();
        if ($membershipPlans->isNotEmpty() && count($clientIds) > 0) {
            $memTotal = 0;
            foreach (array_slice($clientIds, 0, 100) as $cid) {
                if ($faker->boolean(25)) {
                    $plan = $membershipPlans->random();
                    DB::table('subscriptions.client_memberships')->insert([
                        'client_id' => $cid,
                        'membership_plan_id' => $plan->id,
                        'status' => $faker->boolean(80) ? 'ACTIVE' : 'EXPIRED',
                        'starts_at' => Carbon::now()->subMonths(rand(0, 6)),
                        'ends_at' => Carbon::now()->addMonths(rand(1, 12)),
                        'appointments_used' => rand(0, $plan->appointments_included ?? 4),
                        'appointments_remaining' => rand(0, 4),
                        'auto_renew' => $faker->boolean(40),
                        'created_at' => $now, 'updated_at' => $now,
                    ]);
                    $memTotal++;
                }
            }
            $this->command->info("   ✓ {$memTotal} membresías de clientes creadas");
        }

        // ─── 16. LOYALTY CARDS & TRANSACTIONS ─────────────────
        $this->command->info('→ Creando tarjetas fidelidad...');
        $loyaltyPrograms = DB::table('loyalty.loyalty_programs')->get();
        if ($loyaltyPrograms->isNotEmpty() && count($clientIds) > 0) {
            $loyaltyTotal = 0;
            $usedPairs = [];
            foreach (array_slice($clientIds, 0, 150) as $cid) {
                if ($faker->boolean(30)) {
                    $prog = $loyaltyPrograms->random();
                    $pairKey = "{$cid}-{$prog->id}";
                    if (in_array($pairKey, $usedPairs)) continue;
                    $usedPairs[] = $pairKey;
                    $biz = DB::table('loyalty.loyalty_programs')->where('id', $prog->id)->value('business_id');
                    $stamps = rand(0, $prog->stamps_required ?? 10);
                    $completed = $stamps >= ($prog->stamps_required ?? 10);
                    // Check for existing card first
                    $existing = DB::table('loyalty.loyalty_cards')->where('loyalty_program_id', $prog->id)->where('client_id', $cid)->first();
                    if ($existing) continue;
                    $cardId = DB::table('loyalty.loyalty_cards')->insertGetId([
                        'loyalty_program_id' => $prog->id,
                        'client_id' => $cid,
                        'business_id' => $biz ?? $businesses->random()->id,
                        'current_stamps' => $stamps,
                        'total_stamps_ever' => $stamps + rand(0, 5),
                        'rewards_redeemed' => $completed ? rand(1, 3) : 0,
                        'reward_available' => $completed,
                        'status' => $completed ? ($faker->boolean(60) ? 'REDEEMED' : 'COMPLETED') : 'ACTIVE',
                        'last_stamp_at' => Carbon::now()->subDays(rand(0, 30)),
                        'created_at' => $now, 'updated_at' => $now,
                    ]);
                    $txCount = rand(1, $stamps + 2);
                    for ($t = 0; $t < $txCount; $t++) {
                        DB::table('loyalty.loyalty_transactions')->insert([
                            'client_id' => $cid,
                            'points' => $t < $stamps ? 1 : -$prog->stamps_required,
                            'type' => $t < $stamps ? 'EARN' : 'REDEEM',
                            'loyalty_card_id' => $cardId,
                            'description' => $t < $stamps ? 'Sello acumulado' : 'Recompensa canjeada',
                            'created_at' => Carbon::now()->subDays(rand(0, 90)),
                        ]);
                    }
                    $loyaltyTotal++;
                }
            }
            $this->command->info("   ✓ {$loyaltyTotal} tarjetas fidelidad creadas");
        }

        $this->command->info('========================================');
        $this->command->info('  MASSIVE DATA COMPLETADO');
        $this->command->info('========================================');
        $this->command->info("Usuarios totales: " . count($allUsers));
        $this->command->info("Citas: {$totalAppts}");
        $this->command->info("Reseñas: {$totalReviews}");
        $this->command->info("Pagos: {$totalPayments}");
        $this->command->info("XP records: {$totalXP}");
        $this->command->info("Conversaciones AI: {$totalAi}");
        $this->command->info("BNPL: {$bnplTotal}");
        $this->command->info("========================================");
    }
}
