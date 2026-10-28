<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OnDemandDemoSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $clientUserId = DB::table('public.users')->where('email', 'cliente@elegantbarb.com')->value('id');
        $clientId = DB::table('people.clients')->where('user_id', $clientUserId)->value('id');
        $profUserId = DB::table('public.users')->where('email', 'professional@elegantbarb.com')->value('id');

        if (! $clientId) {
            $this->command->warn('OnDemandDemoSeeder: cliente demo no encontrado, saltando.');
            return;
        }

        $business = DB::table('business.businesses')->first();
        $service = DB::table('catalog.services')->where('business_id', $business?->id)->first();
        $professional = DB::table('people.professionals')->where('business_id', $business?->id)->first();

        if (! $business || ! $service || ! $professional) {
            $this->command->warn('OnDemandDemoSeeder: faltan datos de negocio/servicio/profesional.');
            return;
        }

        $statuses = ['SEARCHING', 'ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
        $statusLabels = [
            'SEARCHING' => 'Buscando profesional',
            'ACCEPTED' => 'Profesional asignado',
            'ON_THE_WAY' => 'En camino',
            'IN_PROGRESS' => 'En servicio',
            'COMPLETED' => 'Completado',
            'CANCELLED' => 'Cancelado',
        ];

        $requests = [];
        for ($i = 0; $i < 8; $i++) {
            $status = $statuses[$i % count($statuses)];
            $reqCode = 'OD-' . strtoupper(Str::random(8));
            $reqId = DB::table('on_demand.requests')->insertGetId([
                'client_id' => $clientId,
                'business_id' => $business->id,
                'service_id' => $service->id,
                'professional_id' => in_array($status, ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED']) ? $professional->id : null,
                'request_code' => $reqCode,
                'client_address' => 'Carrera 15 # 45-30, Pereira',
                'client_lat' => 4.8143 + (rand(-100, 100) / 10000),
                'client_lng' => -75.6901 + (rand(-100, 100) / 10000),
                'estimated_price' => $service->price,
                'final_price' => $status === 'COMPLETED' ? $service->price : null,
                'status' => $status,
                'accepted_at' => in_array($status, ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED']) ? $now->copy()->subMinutes(30) : null,
                'started_at' => in_array($status, ['ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED']) ? $now->copy()->subMinutes(20) : null,
                'completed_at' => $status === 'COMPLETED' ? $now->copy()->subMinutes(5) : null,
                'cancelled_at' => $status === 'CANCELLED' ? $now->copy()->subMinutes(10) : null,
                'created_at' => $now->copy()->subHours(rand(1, 48)),
                'updated_at' => $now,
            ]);

            DB::table('on_demand.status_history')->insert([
                'request_id' => $reqId,
                'from_status' => null,
                'to_status' => 'SEARCHING',
                'changed_by' => null,
                'created_at' => $now->copy()->subHours(rand(1, 48)),
            ]);

            if ($status !== 'SEARCHING' && $status !== 'CANCELLED') {
                DB::table('on_demand.status_history')->insert([
                    'request_id' => $reqId,
                    'from_status' => 'SEARCHING',
                    'to_status' => $status,
                    'changed_by' => null,
                    'created_at' => $now->copy()->subMinutes(rand(5, 30)),
                ]);
            }

            $requests[] = $reqId;
        }

        // Tracking locations for accepted/completed requests
        foreach ($requests as $reqId) {
            $req = DB::table('on_demand.requests')->find($reqId);
            if (! $req || ! in_array($req->status, ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'])) continue;

            for ($t = 0; $t < 5; $t++) {
                DB::table('tracking.location_updates')->insert([
                    'user_id' => $profUserId,
                    'professional_id' => $req->professional_id,
                    'trackable_type' => 'App\\Modules\\OnDemand\\Models\\OnDemandRequest',
                    'trackable_id' => $reqId,
                    'lat' => 4.8143 + ($t * 0.001),
                    'lng' => -75.6901 + ($t * 0.001),
                    'accuracy' => 5.0,
                    'speed' => 15.0,
                    'heading' => 90.0,
                    'recorded_at' => $now->copy()->subMinutes(30 - ($t * 5)),
                    'created_at' => $now,
                ]);
            }
        }

        $this->command->info('OnDemandDemoSeeder: 8 requests + tracking locations creados.');
    }
}
