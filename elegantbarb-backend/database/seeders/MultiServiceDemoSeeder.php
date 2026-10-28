<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MultiServiceDemoSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // Truncate existing demo data in reverse dependency order
        DB::statement('TRUNCATE TABLE reviews.reviews CASCADE');
        DB::statement('TRUNCATE TABLE loyalty.loyalty_programs CASCADE');
        DB::statement('TRUNCATE TABLE booking.appointments CASCADE');
        DB::statement('TRUNCATE TABLE booking.resources CASCADE');
        DB::statement('TRUNCATE TABLE people.professional_availability CASCADE');
        DB::statement('TRUNCATE TABLE people.professionals CASCADE');
        DB::statement('TRUNCATE TABLE people.clients CASCADE');
        DB::statement('TRUNCATE TABLE catalog.services CASCADE');
        DB::statement('TRUNCATE TABLE business.branch_schedules CASCADE');
        DB::statement('TRUNCATE TABLE business.business_branches CASCADE');
        DB::statement('TRUNCATE TABLE business.businesses CASCADE');

        // Re-seed categories since CASCADE may have truncated them
        $this->call(BusinessCategorySeeder::class);

        // Ensure categories exist
        $categories = DB::table('platform.business_categories')->pluck('id', 'slug')->toArray();
        if (empty($categories)) {
            $this->call(BusinessCategorySeeder::class);
            $categories = DB::table('platform.business_categories')->pluck('id', 'slug')->toArray();
        }

        $businessesData = [
            [
                'name' => 'The Fade Masters',
                'slug' => 'the-fade-masters',
                'category' => 'barberia',
                'description' => 'Barbería premium especializada en degradados, barba y estilismo masculino. Ambiente urbano con música hip-hop.',
                'address' => 'Carrera 15 # 45-30, Pereira',
                'lat' => 4.8143,
                'lng' => -75.6901,
                'uses_professionals' => true,
                'uses_resources' => false,
                'services' => [
                    ['name' => 'Corte Clásico', 'price' => 25000, 'duration' => 30],
                    ['name' => 'Degradado Premium', 'price' => 35000, 'duration' => 45],
                    ['name' => 'Barba + Corte', 'price' => 45000, 'duration' => 60],
                    ['name' => 'Tratamiento Capilar', 'price' => 60000, 'duration' => 45],
                ],
                'professionals' => [
                    ['name' => 'Carlos "El Maestro" Ruiz', 'specialty' => 'Degradados'],
                    ['name' => 'Andrés Pérez', 'specialty' => 'Barba'],
                    ['name' => 'Luis Torres', 'specialty' => 'Color'],
                ],
            ],
            [
                'name' => 'Ink Soul Tattoo',
                'slug' => 'ink-soul-tattoo',
                'category' => 'tattoo-studio',
                'description' => 'Estudio de tatuajes artísticos con artistas especializados en blackwork, realismo y geometría sagrada.',
                'address' => 'Avenida Circunvalar # 12-45, Pereira',
                'lat' => 4.8080,
                'lng' => -75.6850,
                'uses_professionals' => true,
                'uses_resources' => false,
                'services' => [
                    ['name' => 'Tatuaje Pequeño (hasta 5cm)', 'price' => 120000, 'duration' => 90],
                    ['name' => 'Tatuaje Mediano (5-15cm)', 'price' => 280000, 'duration' => 180],
                    ['name' => 'Tatuaje Grande (+15cm)', 'price' => 500000, 'duration' => 300],
                    ['name' => 'Diseño Personalizado', 'price' => 80000, 'duration' => 60],
                ],
                'professionals' => [
                    ['name' => 'Valentina Ink', 'specialty' => 'Blackwork'],
                    ['name' => 'Diego Real', 'specialty' => 'Realismo'],
                ],
            ],
            [
                'name' => 'Iron Gym Pereira',
                'slug' => 'iron-gym-pereira',
                'category' => 'gym',
                'description' => 'Gimnasio de alto rendimiento con entrenamiento personal, clases grupales y área de cardio.',
                'address' => 'Calle 20 # 15-80, Pereira',
                'lat' => 4.8200,
                'lng' => -75.7000,
                'uses_professionals' => true,
                'uses_resources' => true,
                'services' => [
                    ['name' => 'Entrenamiento Personal', 'price' => 50000, 'duration' => 60],
                    ['name' => 'Clase de Spinning', 'price' => 25000, 'duration' => 45],
                    ['name' => 'Yoga', 'price' => 20000, 'duration' => 60],
                    ['name' => 'CrossFit', 'price' => 35000, 'duration' => 60],
                ],
                'professionals' => [
                    ['name' => 'Santiago "Iron" Vargas', 'specialty' => 'Fuerza'],
                    ['name' => 'María Cardio', 'specialty' => 'Spinning'],
                    ['name' => 'Laura Zen', 'specialty' => 'Yoga'],
                ],
                'resources' => [
                    ['name' => 'Sala de Pesas', 'type' => 'ROOM', 'description' => 'Área completa de pesas libres y máquinas'],
                    ['name' => 'Sala de Spinning', 'type' => 'ROOM', 'description' => '20 bicicletas profesionales'],
                    ['name' => 'Ring de Boxeo', 'type' => 'SPACE', 'description' => 'Ring profesional 6x6m'],
                ],
            ],
            [
                'name' => 'Canchas La 10',
                'slug' => 'canchas-la-10',
                'category' => 'cancha-futbol',
                'description' => 'Canchas de fútbol 5 y 7 sintéticas con iluminación LED, vestuarios y zona de parqueo.',
                'address' => 'Carrera 10 # 35-20, Pereira',
                'lat' => 4.8300,
                'lng' => -75.6800,
                'uses_professionals' => false,
                'uses_resources' => true,
                'services' => [
                    ['name' => 'Cancha Fútbol 5 (1h)', 'price' => 80000, 'duration' => 60],
                    ['name' => 'Cancha Fútbol 7 (1h)', 'price' => 120000, 'duration' => 60],
                    ['name' => 'Torneo Express', 'price' => 500000, 'duration' => 240],
                ],
                'professionals' => [],
                'resources' => [
                    ['name' => 'Cancha 1 - Fútbol 5', 'type' => 'COURT', 'description' => 'Cancha sintética iluminada'],
                    ['name' => 'Cancha 2 - Fútbol 5', 'type' => 'COURT', 'description' => 'Cancha sintética iluminada'],
                    ['name' => 'Cancha 3 - Fútbol 7', 'type' => 'COURT', 'description' => 'Cancha sintética grande'],
                ],
            ],
            [
                'name' => 'Bella Vista Spa',
                'slug' => 'bella-vista-spa',
                'category' => 'beauty-salon',
                'description' => 'Salón de belleza integral: uñas, pestañas, cejas, masajes faciales y tratamientos corporales.',
                'address' => 'Calle 12 # 18-45, Pereira',
                'lat' => 4.8100,
                'lng' => -75.6950,
                'uses_professionals' => true,
                'uses_resources' => false,
                'services' => [
                    ['name' => 'Manicure Gel', 'price' => 45000, 'duration' => 60],
                    ['name' => 'Pedicure Spa', 'price' => 55000, 'duration' => 75],
                    ['name' => 'Lifting de Pestañas', 'price' => 70000, 'duration' => 90],
                    ['name' => 'Microblading Cejas', 'price' => 180000, 'duration' => 120],
                ],
                'professionals' => [
                    ['name' => 'Camila Nails', 'specialty' => 'Uñas'],
                    ['name' => 'Daniela Lashes', 'specialty' => 'Pestañas'],
                ],
            ],
            [
                'name' => 'Serenity Spa & Wellness',
                'slug' => 'serenity-spa-wellness',
                'category' => 'spa',
                'description' => 'Spa de lujo con masajes terapéuticos, faciales rejuvenecedores, sauna y jacuzzi. Experiencia de relax total.',
                'address' => 'Carrera 18 # 25-40, Pereira',
                'lat' => 4.8050,
                'lng' => -75.7100,
                'uses_professionals' => true,
                'uses_resources' => true,
                'services' => [
                    ['name' => 'Masaje Relajante (60min)', 'price' => 90000, 'duration' => 60],
                    ['name' => 'Masaje Descontracturante', 'price' => 120000, 'duration' => 90],
                    ['name' => 'Facial Hidratante', 'price' => 75000, 'duration' => 60],
                    ['name' => 'Ritual de Spa (3h)', 'price' => 280000, 'duration' => 180],
                ],
                'professionals' => [
                    ['name' => 'Isabella Relax', 'specialty' => 'Masajes'],
                    ['name' => 'Fernanda Glow', 'specialty' => 'Faciales'],
                    ['name' => 'Valentina Zen', 'specialty' => 'Terapias'],
                ],
                'resources' => [
                    ['name' => 'Sala de Masajes 1', 'type' => 'ROOM', 'description' => 'Cabina privada con camilla térmica'],
                    ['name' => 'Sala de Masajes 2', 'type' => 'ROOM', 'description' => 'Cabina privada con aromaterapia'],
                    ['name' => 'Sauna & Jacuzzi', 'type' => 'SPACE', 'description' => 'Área de hidroterapia compartida'],
                ],
            ],
            [
                'name' => 'Ritmo Latino Dance Studio',
                'slug' => 'ritmo-latino-dance',
                'category' => 'salon-baile',
                'description' => 'Academia de baile con clases de salsa, bachata, reggaetón y tango. Salas de ensayo disponibles.',
                'address' => 'Avenida 30 de Agosto # 15-60, Pereira',
                'lat' => 4.8150,
                'lng' => -75.6950,
                'uses_professionals' => true,
                'uses_resources' => true,
                'services' => [
                    ['name' => 'Clase de Salsa (1h)', 'price' => 35000, 'duration' => 60],
                    ['name' => 'Clase de Bachata', 'price' => 30000, 'duration' => 60],
                    ['name' => 'Clase Privada Pareja', 'price' => 80000, 'duration' => 60],
                    ['name' => 'Alquiler Sala Ensayo (1h)', 'price' => 45000, 'duration' => 60],
                ],
                'professionals' => [
                    ['name' => 'Mateo Salsa', 'specialty' => 'Salsa'],
                    ['name' => 'Lucía Bachata', 'specialty' => 'Bachata'],
                    ['name' => 'Carlos Tango', 'specialty' => 'Tango'],
                ],
                'resources' => [
                    ['name' => 'Sala Principal', 'type' => 'ROOM', 'description' => 'Espejos, barra y piso de madera'],
                    ['name' => 'Sala de Ensayo 1', 'type' => 'ROOM', 'description' => 'Piso flotante y equipo de sonido'],
                    ['name' => 'Sala de Ensayo 2', 'type' => 'ROOM', 'description' => 'Piso flotante y espejos'],
                ],
            ],
            [
                'name' => 'Pereira Runners Club',
                'slug' => 'pereira-runners-club',
                'category' => 'running-club',
                'description' => 'Club de running con entrenamientos grupales, rutas guiadas y preparación para maratones.',
                'address' => 'Parque El Lago, Pereira',
                'lat' => 4.8180,
                'lng' => -75.7050,
                'uses_professionals' => true,
                'uses_resources' => false,
                'services' => [
                    ['name' => 'Entrenamiento Grupal', 'price' => 20000, 'duration' => 90],
                    ['name' => 'Plan Personalizado 5K', 'price' => 80000, 'duration' => 30],
                    ['name' => 'Plan Personalizado 10K', 'price' => 120000, 'duration' => 30],
                    ['name' => 'Entrenamiento Maratón', 'price' => 250000, 'duration' => 45],
                ],
                'professionals' => [
                    ['name' => 'Andrés Runner', 'specialty' => 'Resistencia'],
                    ['name' => 'Diana Speed', 'specialty' => 'Velocidad'],
                ],
            ],
            [
                'name' => 'Arcadia Game Center',
                'slug' => 'arcadia-game-center',
                'category' => 'espacio-recreativo',
                'description' => 'Centro de entretenimiento con consolas PS5, Xbox, PC gaming, billar y mesas de ping pong.',
                'address' => 'Calle 8 # 20-15, Pereira',
                'lat' => 4.8120,
                'lng' => -75.6880,
                'uses_professionals' => false,
                'uses_resources' => true,
                'services' => [
                    ['name' => 'Hora Consola PS5', 'price' => 25000, 'duration' => 60],
                    ['name' => 'Hora PC Gaming', 'price' => 20000, 'duration' => 60],
                    ['name' => 'Mesa de Billar (1h)', 'price' => 30000, 'duration' => 60],
                    ['name' => 'Paquete Cumpleaños (3h)', 'price' => 300000, 'duration' => 180],
                ],
                'professionals' => [],
                'resources' => [
                    ['name' => 'Estación PS5 - 1', 'type' => 'STATION', 'description' => 'PS5 + 2 controles + pantalla 4K'],
                    ['name' => 'Estación PS5 - 2', 'type' => 'STATION', 'description' => 'PS5 + 2 controles + pantalla 4K'],
                    ['name' => 'PC Gaming - 1', 'type' => 'STATION', 'description' => 'RTX 4070 + monitor 240Hz'],
                    ['name' => 'PC Gaming - 2', 'type' => 'STATION', 'description' => 'RTX 4070 + monitor 240Hz'],
                    ['name' => 'Mesa de Billar', 'type' => 'TABLE', 'description' => 'Mesa profesional'],
                    ['name' => 'Mesa Ping Pong', 'type' => 'TABLE', 'description' => 'Mesa profesional'],
                ],
            ],
        ];

        // Create demo admin users for each business
        $adminUsers = [];
        $businessCount = count($businessesData);
        for ($i = 1; $i <= $businessCount; $i++) {
            $adminUsers[] = DB::table('public.users')->insertGetId([
                'name' => 'Admin Negocio ' . $i,
                'email' => 'admin' . $i . '_demo_' . uniqid() . '@demo.com',
                'password' => Hash::make('password'),
                'role' => 'ADMIN_BARBERIA',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        foreach ($businessesData as $idx => $biz) {
            $catId = $categories[$biz['category']] ?? 1;
            $ownerId = $adminUsers[$idx] ?? $adminUsers[0];

            $businessId = DB::table('business.businesses')->insertGetId([
                'business_category_id' => $catId,
                'owner_user_id' => $ownerId,
                'name' => $biz['name'],
                'slug' => $biz['slug'],
                'description' => $biz['description'],
                'email' => 'contacto@' . $biz['slug'] . '.com',
                'phone' => '310' . str_pad(random_int(1000000, 9999999), 7, '0', STR_PAD_LEFT),
                'primary_color' => '#10B981',
                'verified' => true,
                'rating' => 4.5 + (random_int(0, 10) / 10),
                'reviews_count' => random_int(20, 150),
                'is_active' => true,
                'uses_professionals' => $biz['uses_professionals'],
                'uses_resources' => $biz['uses_resources'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Create main branch
            $branchId = DB::table('business.business_branches')->insertGetId([
                'business_id' => $businessId,
                'name' => 'Sede Principal',
                'address' => $biz['address'],
                'lat' => $biz['lat'],
                'lng' => $biz['lng'],
                'is_main_branch' => true,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Branch schedules
            $days = [
                ['name' => 'monday', 'idx' => 1],
                ['name' => 'tuesday', 'idx' => 2],
                ['name' => 'wednesday', 'idx' => 3],
                ['name' => 'thursday', 'idx' => 4],
                ['name' => 'friday', 'idx' => 5],
                ['name' => 'saturday', 'idx' => 6],
                ['name' => 'sunday', 'idx' => 0],
            ];
            foreach ($days as $day) {
                $isWeekend = in_array($day['name'], ['saturday', 'sunday']);
                DB::table('business.branch_schedules')->insert([
                    'branch_id' => $branchId,
                    'day' => $day['idx'],
                    'open_time' => $isWeekend ? '09:00:00' : '08:00:00',
                    'close_time' => $isWeekend ? '14:00:00' : '20:00:00',
                    'is_closed' => false,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // Services
            foreach ($biz['services'] as $svc) {
                DB::table('catalog.services')->insert([
                    'business_id' => $businessId,
                    'name' => $svc['name'],
                    'description' => 'Servicio de ' . $svc['name'],
                    'price' => $svc['price'],
                    'duration_minutes' => $svc['duration'],
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // Professionals
            foreach ($biz['professionals'] as $prof) {
                $profId = DB::table('people.professionals')->insertGetId([
                    'business_id' => $businessId,
                    'user_id' => null,
                    'name' => $prof['name'],
                    'specialty' => $prof['specialty'],
                    'bio' => 'Especialista en ' . $prof['specialty'],
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                // Availability
                foreach ($days as $day) {
                    DB::table('people.professional_availability')->insert([
                        'professional_id' => $profId,
                        'branch_id' => $branchId,
                        'day_of_week' => $day['idx'],
                        'start_time' => '08:00:00',
                        'end_time' => '20:00:00',
                        'is_available' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }

            // Resources
            if (!empty($biz['resources'])) {
                foreach ($biz['resources'] as $res) {
                    DB::table('booking.resources')->insert([
                        'business_id' => $businessId,
                        'branch_id' => $branchId,
                        'name' => $res['name'],
                        'type' => $res['type'],
                        'description' => $res['description'],
                        'capacity' => 1,
                        'is_active' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        }

        // Create demo clients
        $clientNames = ['Juan Pérez', 'María Gómez', 'Pedro López', 'Ana Torres', 'Luis Ruiz', 'Carolina Mendoza', 'Diego Herrera', 'Sofía Vargas'];
        $clientIds = [];
        foreach ($clientNames as $name) {
            $userId = DB::table('public.users')->insertGetId([
                'name' => $name,
                'email' => Str::slug($name) . '_demo_' . uniqid() . '@demo.com',
                'password' => Hash::make('password'),
                'role' => 'CLIENTE',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $clientIds[] = DB::table('people.clients')->insertGetId([
                'user_id' => $userId,
                'name' => $name,
                'email' => Str::slug($name) . '_demo_' . uniqid() . '@demo.com',
                'phone' => '320' . str_pad(random_int(1000000, 9999999), 7, '0', STR_PAD_LEFT),
                'birthdate' => now()->subYears(random_int(18, 50))->toDateString(),
                'notes' => 'Cliente demo',
                'loyalty_points' => random_int(0, 500),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Create demo appointments
        $businessIds = DB::table('business.businesses')->pluck('id')->toArray();
        foreach ($businessIds as $bId) {
            $professionals = DB::table('people.professionals')->where('business_id', $bId)->pluck('id')->toArray();
            $services = DB::table('catalog.services')->where('business_id', $bId)->pluck('id')->toArray();
            $resources = DB::table('booking.resources')->where('business_id', $bId)->pluck('id')->toArray();
            $branchId = DB::table('business.business_branches')->where('business_id', $bId)->value('id');

            if (empty($services)) continue;

            for ($i = 0; $i < 15; $i++) {
                $date = now()->addDays(random_int(-7, 14))->toDateString();
                $serviceId = $services[array_rand($services)];
                $servicePrice = DB::table('catalog.services')->where('id', $serviceId)->value('price');
                $compatibleResources = DB::table('catalog.resource_services')->where('service_id', $serviceId)->where('is_active', true)->whereIn('resource_id', $resources)->pluck('resource_id')->all();
                if (empty($professionals) && ! empty($resources) && empty($compatibleResources)) continue;
                $statusOptions = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
                $status = $statusOptions[array_rand($statusOptions)];

                $apptData = [
                    'booking_code' => 'EB-' . strtoupper(Str::random(6)),
                    'business_id' => $bId,
                    'branch_id' => $branchId,
                    'client_id' => $clientIds[array_rand($clientIds)],
                    'professional_id' => !empty($professionals) ? $professionals[array_rand($professionals)] : null,
                    'service_id' => $serviceId,
                    'resource_id' => !empty($compatibleResources) ? $compatibleResources[array_rand($compatibleResources)] : null,
                    'date' => $date,
                    'start_time' => sprintf('%02d:00:00', random_int(8, 18)),
                    'end_time' => sprintf('%02d:00:00', random_int(9, 20)),
                    'status' => $status,
                    'payment_status' => $status === 'COMPLETED' ? 'PAID' : 'PENDING',
                    'price' => $servicePrice,
                    'final_price' => $servicePrice,
                    'currency' => 'COP',
                    'notes' => 'Cita demo',
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                DB::table('booking.appointments')->insert($apptData);
            }
        }

        // Create demo reviews
        foreach ($businessIds as $bId) {
            for ($i = 0; $i < random_int(3, 8); $i++) {
                DB::table('reviews.reviews')->insert([
                    'business_id' => $bId,
                    'client_id' => $clientIds[array_rand($clientIds)],
                    'appointment_id' => null,
                    'professional_id' => null,
                    'rating' => random_int(3, 5),
                    'comment' => 'Excelente servicio, muy recomendado. La atención fue de primera.',
                    'is_verified' => true,
                    'is_active' => true,
                    'created_at' => $now->subDays(random_int(1, 60)),
                    'updated_at' => $now,
                ]);
            }
        }

        // Create demo loyalty programs
        foreach ($businessIds as $bId) {
            DB::table('loyalty.loyalty_programs')->insert([
                'business_id' => $bId,
                'name' => 'Programa de Fidelidad',
                'description' => 'Gana puntos por cada servicio y canjea recompensas.',
                'stamps_required' => 10,
                'reward_description' => 'Servicio gratuito',
                'active' => true,
                'valid_until' => now()->addYear(),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $this->command->info('MultiServiceDemoSeeder completado: ' . $businessCount . ' negocios, sucursales, profesionales, servicios, recursos, citas, reseñas y programas de fidelidad creados.');
    }
}
