<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class CompleteDemoSeeder extends Seeder
{
    /**
     * Seeder maestro que pobla TODA la base de datos con datos demo
     * para poder verificar todo el aplicativo.
     *
     * Credenciales demo:
     *   SUPERADMIN:  superadmin@elegantbarb.com / password
     *   ADMIN:       admin@elegantbarb.com / password
     *   PROFESSIONAL: professional@elegantbarb.com / password
     *   CLIENTE:     cliente@elegantbarb.com / password
     *   CLIENTE 2:   maria@elegantbarb.com / password
     */
    public function run(): void
    {
        $this->command->info('========================================');
        $this->command->info('  ELEGANTBARB - COMPLETE DEMO SEEDER');
        $this->command->info('========================================');

        // 1. Base: roles, permisos, categorías de negocio
        $this->call([
            RolesPermissionsSeeder::class,
            BusinessCategorySeeder::class,
        ]);

        // 2. Negocios multiservicio (9 negocios con todo: sucursales, servicios, profesionales, recursos, citas, reseñas, programas fidelidad)
        //    NOTA: Este seeder hace TRUNCATE de varias tablas, por eso va antes de crear usuarios fijos.
        $this->call([
            MultiServiceDemoSeeder::class,
        ]);

        // 3. Usuarios demo fijos (después del truncate para que no sean borrados)
        $this->call([
            DemoUsersSeeder::class,
        ]);

        // 4. Extensiones de plataforma: planes suscripción, wallets (para TODOS los usuarios), transacciones, ads, promociones
        $this->call([
            PlatformExtensionsSeeder::class,
        ]);

        // 5. On-Demand: solicitudes, logs de estado, tracking locations
        $this->call([
            OnDemandDemoSeeder::class,
        ]);

        // 6. Chat: conversaciones, participantes, mensajes
        $this->call([
            ChatDemoSeeder::class,
        ]);

        // 7. Waitlist: entradas de lista de espera
        $this->call([
            WaitlistDemoSeeder::class,
        ]);

        // 8. Notificaciones: notificaciones para todos los usuarios demo
        $this->call([
            NotificationDemoSeeder::class,
        ]);

        // 9. Feature Flags
        $this->call([
            FeatureFlagDemoSeeder::class,
        ]);

        // 10. Webhooks
        $this->call([
            WebhookDemoSeeder::class,
        ]);

        // 11. Pagos + Wallet topups + Retiros
        $this->call([
            PaymentDemoSeeder::class,
        ]);

        // 12. Tarjetas fidelidad + redenciones
        $this->call([
            LoyaltyCardDemoSeeder::class,
        ]);

        // 13. Logs de recomendaciones
        $this->call([
            RecommendationDemoSeeder::class,
        ]);

        // 14. Strategic features: badges, smart queues, membership plans, dynamic pricing
        $this->call([
            StrategicFeaturesDemoSeeder::class,
        ]);

        // 15. Massive data: thousands of records for all tables
        $this->call([
            MassiveDataSeeder::class,
        ]);

        // 16. Flujo fijo por rol: usuarios demo conectados a negocio, profesional, cliente, favoritos y citas
        $this->call([
            DemoFlowsSeeder::class,
        ]);

        $this->command->info('========================================');
        $this->command->info('  DEMO COMPLETADO EXITOSAMENTE');
        $this->command->info('========================================');
        $this->command->info('CREDENCIALES:');
        $this->command->info('  SUPERADMIN:  superadmin@elegantbarb.com / password');
        $this->command->info('  ADMIN:       admin@elegantbarb.com / password');
        $this->command->info('  PROFESSIONAL: professional@elegantbarb.com / password');
        $this->command->info('  CLIENTE:     cliente@elegantbarb.com / password');
        $this->command->info('  CLIENTE 2:   maria@elegantbarb.com / password');
        $this->command->info('========================================');
        $this->command->info('DATOS CREADOS:');
        $this->command->info('  - 9 negocios multiservicio');
        $this->command->info('  - 25+ profesionales');
        $this->command->info('  - 30+ servicios');
        $this->command->info('  - 135+ citas');
        $this->command->info('  - 8 solicitudes on-demand');
        $this->command->info('  - 3 conversaciones de chat');
        $this->command->info('  - 5 entradas waitlist');
        $this->command->info('  - 25 notificaciones');
        $this->command->info('  - 7 feature flags');
        $this->command->info('  - 1 webhook + deliveries');
        $this->command->info('  - 6 pagos + 4 topups + 2 retiros');
        $this->command->info('  - Tarjetas fidelidad + redenciones');
        $this->command->info('  - 20 logs de recomendación');
        $this->command->info('========================================');
    }
}
