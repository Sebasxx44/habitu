<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MigrateDataCommand extends Command
{
    protected $signature = 'data:migrate
                            {--step= : Ejecutar solo un paso específico (1-10)}
                            {--dry-run : Mostrar qué se haría sin ejecutar}
                            {--rollback : Revertir la última migración}';

    protected $description = 'Migrar datos de tablas antiguas (barbería) a tablas nuevas (multiservicio)';

    private array $stats = [];
    private bool $dryRun = false;

    public function handle(): int
    {
        $this->dryRun = $this->option('dry-run');

        if ($this->option('rollback')) {
            return $this->rollback();
        }

        $step = $this->option('step');

        if ($step) {
            return $this->runStep((int) $step);
        }

        return $this->runAll();
    }

    private function runAll(): int
    {
        $this->info('=== MIGRACIÓN DE DATOS ELEGANTBARB → MULTISERVICIO ===');
        $this->info('Modo: ' . ($this->dryRun ? 'DRY-RUN' : 'REAL'));
        $this->newLine();

        $steps = [
            1 => 'Crear categoría Barbería',
            2 => 'Migrar barber_shops → businesses + branches',
            3 => 'Migrar barbers → professionals',
            4 => 'Migrar clients',
            5 => 'Migrar services + categorías',
            6 => 'Migrar appointments',
            7 => 'Migrar marketing (promotions, campaigns)',
            8 => 'Migrar loyalty (programs, cards, transactions)',
            9 => 'Migrar reviews',
            10 => 'Migrar favorites + hours',
        ];

        foreach ($steps as $num => $desc) {
            $this->info("Paso $num: $desc");
            $result = $this->runStep($num);
            if ($result !== self::SUCCESS) {
                $this->error("❌ Paso $num falló. Abortando.");
                return self::FAILURE;
            }
            $this->info("✅ Paso $num completado");
            $this->newLine();
        }

        $this->info('=== MIGRACIÓN COMPLETADA ===');
        $this->table(['Tabla Origen', 'Registros', 'Tabla Destino', 'Registros', 'Estado'], $this->stats);

        return self::SUCCESS;
    }

    private function runStep(int $step): int
    {
        try {
            return match ($step) {
                1 => $this->step1CreateBarberCategory(),
                2 => $this->step2MigrateBusinesses(),
                3 => $this->step3MigrateProfessionals(),
                4 => $this->step4MigrateClients(),
                5 => $this->step5MigrateServices(),
                6 => $this->step6MigrateAppointments(),
                7 => $this->step7MigrateMarketing(),
                8 => $this->step8MigrateLoyalty(),
                9 => $this->step9MigrateReviews(),
                10 => $this->step10MigrateFavoritesAndHours(),
                default => $this->failMigration("Paso $step no existe"),
            };
        } catch (\Throwable $e) {
            $this->error("Error en paso $step: " . $e->getMessage());
            $this->error($e->getTraceAsString());
            return self::FAILURE;
        }
    }

    // ───────────────────────────────────────────
    // PASO 1: Crear categoría Barbería
    // ───────────────────────────────────────────
    private function step1CreateBarberCategory(): int
    {
        if ($this->dryRun) {
            $this->line('Would insert business category "Barbería" into platform.business_categories');
            return self::SUCCESS;
        }

        $exists = DB::table('platform.business_categories')->where('slug', 'barberia')->first();
        if ($exists) {
            $this->warn('Categoría Barbería ya existe (id: ' . $exists->id . ')');
            return self::SUCCESS;
        }

        DB::table('platform.business_categories')->insert([
            'name' => 'Barbería',
            'slug' => 'barberia',
            'icon' => 'Scissors',
            'color' => '#10B981',
            'sort_order' => 1,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->info('Categoría Barbería creada');
        return self::SUCCESS;
    }

    // ───────────────────────────────────────────
    // PASO 2: Migrar barber_shops → businesses + branches
    // ───────────────────────────────────────────
    private function step2MigrateBusinesses(): int
    {
        $sourceCount = DB::table('barber_shops')->count();
        $this->info("Source: barber_shops ($sourceCount registros)");

        if ($this->dryRun) {
            $this->line("Would migrate $sourceCount barber shops to business.businesses + business_branches");
            return self::SUCCESS;
        }

        $category = DB::table('platform.business_categories')->where('slug', 'barberia')->first();
        if (! $category) {
            return $this->failMigration('Categoría Barbería no encontrada. Ejecuta paso 1 primero.');
        }

        DB::transaction(function () use ($category, $sourceCount) {
            $shops = DB::table('barber_shops')->get();

            foreach ($shops as $shop) {
                // Buscar owner (ADMIN_BARBERIA de este shop)
                $owner = DB::table('users')
                    ->where('barber_shop_id', $shop->id)
                    ->whereIn('role', ['ADMIN_BARBERIA', 'BUSINESS_ADMIN'])
                    ->first();

                $ownerId = $owner?->id ?? 1; // fallback a superadmin

                $slug = Str::slug($shop->name) . '-' . $shop->id;

                // Insertar business
                DB::table('business.businesses')->insert([
                    'id' => $shop->id, // preservar ID para relaciones
                    'business_category_id' => $category->id,
                    'owner_user_id' => $ownerId,
                    'name' => $shop->name,
                    'slug' => $slug,
                    'description' => $shop->description,
                    'email' => $shop->email,
                    'phone' => $shop->phone,
                    'banner_url' => $shop->banner_url,
                    'logo_url' => $shop->photo_url,
                    'primary_color' => '#10B981',
                    'verified' => true,
                    'rating' => 5.0,
                    'reviews_count' => 0,
                    'license_id' => $shop->license_id,
                    'is_active' => $shop->active ?? true,
                    'created_at' => $shop->created_at ?? now(),
                    'updated_at' => $shop->updated_at ?? now(),
                ]);

                // Insertar branch principal
                DB::table('business.business_branches')->insert([
                    'business_id' => $shop->id,
                    'name' => 'Sede Principal',
                    'address' => $shop->address,
                    'city_id' => $shop->city_id,
                    'lat' => $shop->lat,
                    'lng' => $shop->lng,
                    'phone' => $shop->phone,
                    'email' => $shop->email,
                    'is_main_branch' => true,
                    'is_active' => $shop->active ?? true,
                    'created_at' => $shop->created_at ?? now(),
                    'updated_at' => $shop->updated_at ?? now(),
                ]);

                // Insertar social links
                if ($shop->whatsapp) {
                    DB::table('business.business_social_links')->insert([
                        'business_id' => $shop->id,
                        'platform' => 'whatsapp',
                        'url' => $shop->whatsapp,
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
                if ($shop->instagram) {
                    DB::table('business.business_social_links')->insert([
                        'business_id' => $shop->id,
                        'platform' => 'instagram',
                        'url' => $shop->instagram,
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            $destCount = DB::table('business.businesses')->count();
            $branchCount = DB::table('business.business_branches')->count();

            $this->stats[] = ['barber_shops', $sourceCount, 'businesses', $destCount, $destCount === $sourceCount ? '✅' : '⚠️'];
            $this->stats[] = ['-', '-', 'business_branches', $branchCount, $branchCount === $sourceCount ? '✅' : '⚠️'];
        });

        return self::SUCCESS;
    }

    // ───────────────────────────────────────────
    // PASO 3: Migrar barbers → professionals
    // ───────────────────────────────────────────
    private function step3MigrateProfessionals(): int
    {
        $sourceCount = DB::table('barbers')->count();
        $this->info("Source: barbers ($sourceCount registros)");

        if ($this->dryRun) {
            $this->line("Would migrate $sourceCount barbers to people.professionals");
            return self::SUCCESS;
        }

        DB::transaction(function () use ($sourceCount) {
            $barbers = DB::table('barbers')->get();

            foreach ($barbers as $barber) {
                // Buscar user asociado
                $user = DB::table('users')
                    ->where('barber_id', $barber->id)
                    ->whereIn('role', ['BARBERO', 'PROFESSIONAL'])
                    ->first();

                $userId = $user?->id;

                DB::table('people.professionals')->insert([
                    'id' => $barber->id,
                    'user_id' => $userId,
                    'business_id' => $barber->barber_shop_id,
                    'name' => $barber->name,
                    'email' => $barber->email,
                    'phone' => $barber->phone,
                    'specialty' => $barber->specialty,
                    'bio' => $barber->bio,
                    'photo_url' => $barber->photo_url,
                    'identification_number' => $barber->identification_number,
                    'commission_percentage' => $barber->commission_percentage ?? 50.00,
                    'address' => $barber->address,
                    'birthday' => $barber->birthday,
                    'social_links' => $barber->social_media,
                    'is_active' => $barber->active ?? true,
                    'created_at' => $barber->created_at ?? now(),
                    'updated_at' => $barber->updated_at ?? now(),
                ]);
            }

            $destCount = DB::table('people.professionals')->count();
            $this->stats[] = ['barbers', $sourceCount, 'professionals', $destCount, $destCount === $sourceCount ? '✅' : '⚠️'];
        });

        return self::SUCCESS;
    }

    // ───────────────────────────────────────────
    // PASO 4: Migrar clients
    // ───────────────────────────────────────────
    private function step4MigrateClients(): int
    {
        $sourceCount = DB::table('clients')->count();
        $this->info("Source: clients ($sourceCount registros)");

        if ($this->dryRun) {
            $this->line("Would migrate $sourceCount clients to people.clients");
            return self::SUCCESS;
        }

        DB::transaction(function () use ($sourceCount) {
            $clients = DB::table('clients')->get();

            foreach ($clients as $client) {
                $user = DB::table('users')
                    ->where('cliente_id', $client->id)
                    ->whereIn('role', ['CLIENTE', 'CLIENT'])
                    ->first();

                DB::table('people.clients')->insert([
                    'id' => $client->id,
                    'user_id' => $user?->id,
                    'business_id' => $client->barber_shop_id,
                    'name' => $client->name,
                    'email' => $client->email,
                    'phone' => $client->phone,
                    'loyalty_points' => $client->loyalty_points ?? 0,
                    'xp_points' => $client->xp_points ?? 0,
                    'tier' => strtoupper($client->tier ?? 'BRONZE'),
                    'is_vip' => $client->is_vip ?? false,
                    'created_at' => $client->created_at ?? now(),
                    'updated_at' => $client->updated_at ?? now(),
                ]);
            }

            $destCount = DB::table('people.clients')->count();
            $this->stats[] = ['clients', $sourceCount, 'clients', $destCount, $destCount === $sourceCount ? '✅' : '⚠️'];
        });

        return self::SUCCESS;
    }

    // ───────────────────────────────────────────
    // PASO 5: Migrar services + categorías
    // ───────────────────────────────────────────
    private function step5MigrateServices(): int
    {
        $sourceCount = DB::table('services')->count();
        $this->info("Source: services ($sourceCount registros)");

        if ($this->dryRun) {
            $this->line("Would migrate $sourceCount services to catalog.services");
            return self::SUCCESS;
        }

        DB::transaction(function () use ($sourceCount) {
            // Crear categoría default por negocio
            $shops = DB::table('barber_shops')->pluck('id');
            $categoryMap = [];

            foreach ($shops as $shopId) {
                $catId = DB::table('catalog.service_categories')->insertGetId([
                    'business_id' => $shopId,
                    'name' => 'General',
                    'description' => 'Servicios generales',
                    'sort_order' => 0,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $categoryMap[$shopId] = $catId;
            }

            $services = DB::table('services')->get();

            foreach ($services as $service) {
                DB::table('catalog.services')->insert([
                    'id' => $service->id,
                    'business_id' => $service->barber_shop_id,
                    'service_category_id' => $categoryMap[$service->barber_shop_id] ?? null,
                    'name' => $service->name,
                    'description' => $service->description,
                    'price' => $service->price,
                    'duration_minutes' => $service->duration_minutes,
                    'image_url' => $service->image_url,
                    'media_gallery' => $service->media_gallery,
                    'requires_professional' => true,
                    'is_active' => $service->active ?? true,
                    'created_at' => $service->created_at ?? now(),
                    'updated_at' => $service->updated_at ?? now(),
                ]);

                // Crear branch_services para la sucursal principal
                $mainBranch = DB::table('business.business_branches')
                    ->where('business_id', $service->barber_shop_id)
                    ->where('is_main_branch', true)
                    ->first();

                if ($mainBranch) {
                    DB::table('catalog.branch_services')->insert([
                        'branch_id' => $mainBranch->id,
                        'service_id' => $service->id,
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            $destCount = DB::table('catalog.services')->count();
            $this->stats[] = ['services', $sourceCount, 'services', $destCount, $destCount === $sourceCount ? '✅' : '⚠️'];
        });

        return self::SUCCESS;
    }

    // ───────────────────────────────────────────
    // PASO 6: Migrar appointments
    // ───────────────────────────────────────────
    private function step6MigrateAppointments(): int
    {
        $sourceCount = DB::table('appointments')->count();
        $this->info("Source: appointments ($sourceCount registros)");

        if ($this->dryRun) {
            $this->line("Would migrate $sourceCount appointments to booking.appointments");
            return self::SUCCESS;
        }

        DB::transaction(function () use ($sourceCount) {
            $appointments = DB::table('appointments')->get();
            $serviceDurations = DB::table('catalog.services')->pluck('duration_minutes', 'id');

            foreach ($appointments as $appt) {
                $duration = $serviceDurations[$appt->service_id] ?? 30;
                $endTime = \Carbon\Carbon::parse($appt->time)->addMinutes($duration)->format('H:i:s');

                $statusMap = [
                    'PENDIENTE' => 'PENDING',
                    'CONFIRMADA' => 'CONFIRMED',
                    'COMPLETADA' => 'COMPLETED',
                    'CANCELADA' => 'CANCELLED',
                    'NO_ASISTIO' => 'NO_SHOW',
                ];

                $mainBranch = DB::table('business.business_branches')
                    ->where('business_id', $appt->barber_shop_id)
                    ->where('is_main_branch', true)
                    ->first();

                DB::table('booking.appointments')->insert([
                    'id' => $appt->id,
                    'booking_code' => $appt->booking_code,
                    'business_id' => $appt->barber_shop_id,
                    'branch_id' => $mainBranch?->id,
                    'client_id' => $appt->client_id,
                    'professional_id' => $appt->barber_id,
                    'service_id' => $appt->service_id,
                    'date' => $appt->date,
                    'start_time' => $appt->time,
                    'end_time' => $endTime,
                    'status' => $statusMap[$appt->status] ?? 'PENDING',
                    'payment_status' => ($appt->paid ?? false) ? 'PAID' : 'PENDING',
                    'price' => $appt->price,
                    'discount_amount' => 0,
                    'final_price' => $appt->price,
                    'notes' => null,
                    'source' => 'web',
                    'created_at' => $appt->created_at ?? now(),
                    'updated_at' => $appt->updated_at ?? now(),
                ]);
            }

            $destCount = DB::table('booking.appointments')->count();
            $this->stats[] = ['appointments', $sourceCount, 'appointments', $destCount, $destCount === $sourceCount ? '✅' : '⚠️'];
        });

        return self::SUCCESS;
    }

    // ───────────────────────────────────────────
    // PASO 7: Migrar marketing
    // ───────────────────────────────────────────
    private function step7MigrateMarketing(): int
    {
        $promoCount = DB::table('promotions')->count();
        $campaignCount = DB::table('campaigns')->count();

        $this->info("Source: promotions ($promoCount), campaigns ($campaignCount)");

        if ($this->dryRun) {
            $this->line("Would migrate promotions and campaigns");
            return self::SUCCESS;
        }

        DB::transaction(function () use ($promoCount, $campaignCount) {
            // Promotions
            $promotions = DB::table('promotions')->get();
            foreach ($promotions as $promo) {
                DB::table('marketing.promotions')->insert([
                    'id' => $promo->id,
                    'business_id' => $promo->barber_shop_id,
                    'title' => $promo->title,
                    'description' => $promo->description,
                    'discount' => $promo->discount,
                    'type' => $promo->type === 'PORCENTAJE' ? 'PERCENTAGE' : 'FIXED_AMOUNT',
                    'start_date' => $promo->start_date,
                    'end_date' => $promo->end_date,
                    'promo_code' => $promo->promo_code,
                    'image_url' => $promo->image_url,
                    'is_active' => $promo->active ?? true,
                    'created_at' => $promo->created_at ?? now(),
                    'updated_at' => $promo->updated_at ?? now(),
                ]);
            }

            // Campaigns
            $campaigns = DB::table('campaigns')->get();
            foreach ($campaigns as $camp) {
                DB::table('marketing.campaigns')->insert([
                    'id' => $camp->id,
                    'user_id' => $camp->user_id,
                    'business_id' => $camp->barber_shop_id,
                    'subject' => $camp->subject,
                    'body' => $camp->body,
                    'type' => $camp->type ?? 'CUSTOM',
                    'status' => $camp->status ?? 'DRAFT',
                    'target_role' => $camp->target_role,
                    'target_ids' => $camp->target_ids,
                    'recipients_count' => $camp->recipients_count ?? 0,
                    'sent_count' => $camp->sent_count ?? 0,
                    'sent_at' => $camp->sent_at,
                    'created_at' => $camp->created_at ?? now(),
                    'updated_at' => $camp->updated_at ?? now(),
                ]);
            }

            $destPromo = DB::table('marketing.promotions')->count();
            $destCamp = DB::table('marketing.campaigns')->count();

            $this->stats[] = ['promotions', $promoCount, 'promotions', $destPromo, $destPromo === $promoCount ? '✅' : '⚠️'];
            $this->stats[] = ['campaigns', $campaignCount, 'campaigns', $destCamp, $destCamp === $campaignCount ? '✅' : '⚠️'];
        });

        return self::SUCCESS;
    }

    // ───────────────────────────────────────────
    // PASO 8: Migrar loyalty
    // ───────────────────────────────────────────
    private function step8MigrateLoyalty(): int
    {
        $progCount = DB::table('loyalty_programs')->count();
        $cardCount = DB::table('loyalty_cards')->count();
        $transCount = DB::table('loyalty_transactions')->count();

        $this->info("Source: programs ($progCount), cards ($cardCount), transactions ($transCount)");

        if ($this->dryRun) {
            $this->line("Would migrate loyalty data");
            return self::SUCCESS;
        }

        DB::transaction(function () use ($progCount, $cardCount, $transCount) {
            // Programs
            $programs = DB::table('loyalty_programs')->get();
            foreach ($programs as $prog) {
                DB::table('loyalty.loyalty_programs')->insert([
                    'id' => $prog->id,
                    'business_id' => $prog->barber_shop_id,
                    'professional_id' => $prog->barber_id,
                    'service_id' => $prog->service_id,
                    'name' => $prog->name,
                    'description' => $prog->description,
                    'type' => 'STAMP',
                    'stamps_required' => $prog->stamps_required ?? 5,
                    'reward_description' => $prog->reward_description,
                    'active' => $prog->active ?? true,
                    'valid_until' => $prog->valid_until,
                    'created_at' => $prog->created_at ?? now(),
                    'updated_at' => $prog->updated_at ?? now(),
                ]);
            }

            // Cards
            $cards = DB::table('loyalty_cards')->get();
            foreach ($cards as $card) {
                DB::table('loyalty.loyalty_cards')->insert([
                    'id' => $card->id,
                    'loyalty_program_id' => $card->loyalty_program_id,
                    'client_id' => $card->client_id,
                    'business_id' => $card->barber_shop_id,
                    'current_stamps' => $card->current_stamps ?? 0,
                    'total_stamps_ever' => $card->total_stamps_ever ?? 0,
                    'rewards_redeemed' => $card->rewards_redeemed ?? 0,
                    'reward_available' => $card->reward_available ?? false,
                    'status' => ($card->status === 'ACTIVE' || $card->status === 'COMPLETED') ? $card->status : 'SUSPENDED',
                    'last_stamp_at' => $card->last_stamp_at,
                    'created_at' => $card->created_at ?? now(),
                    'updated_at' => $card->updated_at ?? now(),
                ]);
            }

            // Transactions
            $transactions = DB::table('loyalty_transactions')->get();
            foreach ($transactions as $trans) {
                DB::table('loyalty.loyalty_transactions')->insert([
                    'id' => $trans->id,
                    'client_id' => $trans->client_id,
                    'points' => $trans->points,
                    'type' => $trans->type === 'EARN' ? 'EARN' : 'REDEEM',
                    'appointment_id' => $trans->appointment_id,
                    'description' => $trans->description,
                    'created_at' => $trans->created_at ?? now(),
                ]);
            }

            $destProg = DB::table('loyalty.loyalty_programs')->count();
            $destCard = DB::table('loyalty.loyalty_cards')->count();
            $destTrans = DB::table('loyalty.loyalty_transactions')->count();

            $this->stats[] = ['loyalty_programs', $progCount, 'loyalty_programs', $destProg, $destProg === $progCount ? '✅' : '⚠️'];
            $this->stats[] = ['loyalty_cards', $cardCount, 'loyalty_cards', $destCard, $destCard === $cardCount ? '✅' : '⚠️'];
            $this->stats[] = ['loyalty_transactions', $transCount, 'loyalty_transactions', $destTrans, $destTrans === $transCount ? '✅' : '⚠️'];
        });

        return self::SUCCESS;
    }

    // ───────────────────────────────────────────
    // PASO 9: Migrar reviews
    // ───────────────────────────────────────────
    private function step9MigrateReviews(): int
    {
        $sourceCount = DB::table('reviews')->count();
        $this->info("Source: reviews ($sourceCount registros)");

        if ($this->dryRun) {
            $this->line("Would migrate $sourceCount reviews");
            return self::SUCCESS;
        }

        DB::transaction(function () use ($sourceCount) {
            $reviews = DB::table('reviews')->get();
            $validClientIds = DB::table('people.clients')->pluck('id')->toArray();
            $skipped = 0;

            foreach ($reviews as $review) {
                if (! in_array($review->client_id, $validClientIds)) {
                    $skipped++;
                    continue;
                }

                $mainBranch = DB::table('business.business_branches')
                    ->where('business_id', $review->barber_shop_id)
                    ->where('is_main_branch', true)
                    ->first();

                DB::table('reviews.reviews')->insert([
                    'id' => $review->id,
                    'business_id' => $review->barber_shop_id,
                    'branch_id' => $mainBranch?->id,
                    'client_id' => $review->client_id,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'is_active' => true,
                    'created_at' => $review->created_at ?? now(),
                    'updated_at' => $review->updated_at ?? now(),
                ]);
            }

            $destCount = DB::table('reviews.reviews')->count();
            $status = $skipped > 0 ? "✅ ({$skipped} huérfanos omitidos)" : '✅';
            $this->stats[] = ['reviews', $sourceCount, 'reviews', $destCount, $status];
        });

        return self::SUCCESS;
    }

    // ───────────────────────────────────────────
    // PASO 10: Migrar favorites + hours
    // ───────────────────────────────────────────
    private function step10MigrateFavoritesAndHours(): int
    {
        $favBarberCount = DB::table('favorite_barbers')->count();
        $favShopCount = DB::table('favorite_shops')->count();
        $hoursCount = DB::table('hours')->count();

        $this->info("Source: favorite_barbers ($favBarberCount), favorite_shops ($favShopCount), hours ($hoursCount)");

        if ($this->dryRun) {
            $this->line("Would migrate favorites and hours");
            return self::SUCCESS;
        }

        DB::transaction(function () use ($favBarberCount, $favShopCount, $hoursCount) {
            // Favorite barbers → professionals
            $favBarbers = DB::table('favorite_barbers')->get();
            foreach ($favBarbers as $fav) {
                DB::table('people.favorite_professionals')->insert([
                    'client_id' => $fav->client_id,
                    'professional_id' => $fav->barber_id,
                    'created_at' => $fav->created_at ?? now(),
                ]);
            }

            // Favorite shops → businesses
            $favShops = DB::table('favorite_shops')->get();
            foreach ($favShops as $fav) {
                DB::table('people.favorite_businesses')->insert([
                    'client_id' => $fav->client_id,
                    'business_id' => $fav->barber_shop_id,
                    'created_at' => $fav->created_at ?? now(),
                ]);
            }

            // Hours → branch_schedules
            $hours = DB::table('hours')->get();
            foreach ($hours as $hour) {
                $mainBranch = DB::table('business.business_branches')
                    ->where('business_id', $hour->barber_shop_id)
                    ->where('is_main_branch', true)
                    ->first();

                if ($mainBranch) {
                    DB::table('business.branch_schedules')->insert([
                        'branch_id' => $mainBranch->id,
                        'day' => $hour->day,
                        'open_time' => $hour->open_time,
                        'close_time' => $hour->close_time,
                        'is_closed' => $hour->closed ?? false,
                        'created_at' => $hour->created_at ?? now(),
                        'updated_at' => $hour->updated_at ?? now(),
                    ]);
                }
            }

            $destFavProf = DB::table('people.favorite_professionals')->count();
            $destFavBus = DB::table('people.favorite_businesses')->count();
            $destHours = DB::table('business.branch_schedules')->count();

            $this->stats[] = ['favorite_barbers', $favBarberCount, 'favorite_professionals', $destFavProf, $destFavProf === $favBarberCount ? '✅' : '⚠️'];
            $this->stats[] = ['favorite_shops', $favShopCount, 'favorite_businesses', $destFavBus, $destFavBus === $favShopCount ? '✅' : '⚠️'];
            $this->stats[] = ['hours', $hoursCount, 'branch_schedules', $destHours, $destHours === $hoursCount ? '✅' : '⚠️'];
        });

        return self::SUCCESS;
    }

    // ───────────────────────────────────────────
    // ROLLBACK
    // ───────────────────────────────────────────
    private function rollback(): int
    {
        $this->warn('=== ROLLBACK DE MIGRACIÓN ===');
        $this->warn('Esto eliminará TODOS los datos de las tablas nuevas.');

        if (! $this->confirm('¿Estás seguro?')) {
            return self::SUCCESS;
        }

        $tables = [
            'reviews.reviews',
            'loyalty.loyalty_transactions',
            'loyalty.loyalty_cards',
            'loyalty.loyalty_programs',
            'loyalty.client_levels',
            'marketing.campaign_logs',
            'marketing.campaigns',
            'marketing.promotion_redemptions',
            'marketing.promotion_service',
            'marketing.promotions',
            'marketing.notifications',
            'finance.subscriptions',
            'finance.payment_methods',
            'finance.professional_payouts',
            'finance.expenses',
            'finance.payments',
            'booking.appointment_reschedules',
            'booking.appointment_cancellations',
            'booking.appointments',
            'booking.resources',
            'catalog.professional_services',
            'catalog.branch_services',
            'catalog.services',
            'catalog.service_categories',
            'people.favorite_businesses',
            'people.favorite_professionals',
            'people.professional_portfolios',
            'people.professional_availability',
            'people.clients',
            'people.professionals',
            'business.branch_schedules',
            'business.business_social_links',
            'business.business_branches',
            'business.businesses',
            'platform.business_categories',
        ];

        foreach ($tables as $table) {
            DB::table($table)->delete();
            $this->info("Limpiada: $table");
        }

        $this->info('Rollback completado.');
        return self::SUCCESS;
    }

    private function failMigration(string $message): int
    {
        $this->error($message);
        return self::FAILURE;
    }
}
