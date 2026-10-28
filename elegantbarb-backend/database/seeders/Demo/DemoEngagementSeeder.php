<?php

namespace Database\Seeders\Demo;

use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Fixtures isolated by demo accounts, demo business and stable demo references. No events or deliveries. */
class DemoEngagementSeeder extends Seeder
{
    private CarbonImmutable $now;

    public function run(): void
    {
        $this->now = CarbonImmutable::now(config('booking.timezone', 'America/Bogota'));
        DB::transaction(fn () => $this->seedDemo());
    }

    private function seedDemo(): void
    {
        // CONTEXT — fail before writing when the preceding demo catalog is absent.
        $users = User::whereIn('email', [DemoData::SUPERADMIN_EMAIL, DemoData::ADMIN_EMAIL,
            DemoData::PROFESSIONAL_EMAIL, DemoData::CLIENT_EMAIL])->get()->keyBy('email');
        if ($users->count() !== 4) throw new \RuntimeException('Primero ejecuta las identidades de demostración.');
        $admin = $users[DemoData::ADMIN_EMAIL];
        $clientUser = $users[DemoData::CLIENT_EMAIL];
        $professionalUser = $users[DemoData::PROFESSIONAL_EMAIL];
        $business = Business::where('slug', DemoData::BUSINESS_SLUG)->where('owner_user_id', $admin->id)->firstOrFail();
        $client = Client::where('user_id', $clientUser->id)->where('business_id', $business->id)->firstOrFail();
        $professional = Professional::where('user_id', $professionalUser->id)->where('business_id', $business->id)->firstOrFail();
        $service = Service::where('business_id', $business->id)->where('is_active', true)->orderBy('id')->firstOrFail();
        $branch = $business->branches()->where('is_main_branch', true)->firstOrFail();
        $demoBusinesses = Business::whereIn('slug', [DemoData::BUSINESS_SLUG, 'demo-spa-botanico', 'demo-canchas-arena'])
            ->whereHas('owner', fn ($owners) => $owners->whereIn('email', [DemoData::ADMIN_EMAIL, 'admin.spa.demo@elegantbarb.test', 'admin.arena.demo@elegantbarb.test']))
            ->orderBy('id')->get();

        $this->notifications($users, $business, $client, $professional);
        $this->marketing($admin, $demoBusinesses);
        $requestId = $this->onDemand($business, $branch, $client, $professional, $service, $clientUser, $professionalUser);
        $this->chat($users, $business, $requestId);
        $this->queues($business, $branch, $client, $professional, $service);
        $this->gamification($clientUser, $professionalUser, $demoBusinesses);
        $this->recommendations($clientUser, $demoBusinesses);
        $this->configuration($admin, $business, $service);
        $this->assistantExample($clientUser, $business);
    }

    private function notifications(Collection $users, Business $business, Client $client, Professional $professional): void
    {
        $next = Appointment::where('client_id', $client->id)->where('source', 'demo')
            ->whereIn('status', ['PENDING', 'CONFIRMED'])->whereDate('date', '>=', $this->now->toDateString())
            ->orderBy('date')->orderBy('start_time')->first();
        $today = Appointment::where('professional_id', $professional->id)->where('source', 'demo')
            ->whereDate('date', $this->now->toDateString())->count();
        $messages = [
            DemoData::SUPERADMIN_EMAIL => ['Plataforma lista para explorar', 'Los negocios y las cuentas de demostración están disponibles para revisar los módulos de la plataforma.'],
            DemoData::ADMIN_EMAIL => ['Tu negocio tiene actividad', $business->name.' tiene citas, clientes, reportes y borradores de campaña para el recorrido de demostración.'],
            DemoData::PROFESSIONAL_EMAIL => ['Tu agenda de hoy', 'Tienes '.$today.' citas de demostración registradas para hoy. Consulta los horarios en tu agenda.'],
            DemoData::CLIENT_EMAIL => ['Tu próxima experiencia', $next
                ? 'Tu cita está registrada para el '.$next->date->format('d/m/Y').' a las '.substr($next->getRawOriginal('start_time'), 0, 5).'.'
                : 'Puedes elegir un servicio y reservar en los negocios de demostración.'],
        ];
        foreach ($users as $user) {
            [$title, $message] = $messages[$user->email];
            foreach ([[$title, $message, false], ['Bienvenido a HABITU Demo', 'Este espacio contiene datos de demostración identificados. Ningún correo ni mensaje externo fue enviado al prepararlo.', true]] as $index => [$subject, $body, $read]) {
                $this->put('marketing.notifications', ['user_id' => $user->id, 'title' => '[Demo] '.$subject], [
                    'type' => $index === 0 ? 'APPOINTMENT' : 'SYSTEM', 'message' => $body,
                    'data' => $this->json(['demo_seed' => 'engagement-v1', 'business_id' => $business->id]),
                    'read' => $read, 'read_at' => $read ? $this->now->subHour() : null,
                    'created_at' => $this->now->subMinutes($index === 0 ? 10 : 120),
                ]);
            }
        }
    }

    private function marketing(User $admin, Collection $businesses): void
    {
        $frontend = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
        foreach ($businesses as $index => $business) {
            $service = Service::where('business_id', $business->id)->where('is_active', true)->orderBy('id')->firstOrFail();
            $this->put('marketing.campaigns', ['business_id' => $business->id, 'subject' => '[Demo] Descubre '.$business->name], [
                'user_id' => $business->owner_user_id, 'body' => '<h2>Tu próxima experiencia</h2><p>Conoce nuestros servicios y encuentra un horario para ti.</p><p>Campaña de demostración: este borrador no se ha enviado.</p>',
                'type' => 'PROMO', 'status' => 'DRAFT', 'target_role' => 'CLIENTE', 'target_ids' => $this->json([]),
                'recipients_count' => 0, 'sent_count' => 0, 'sent_at' => null, 'scheduled_at' => null, 'error_log' => null,
            ]);
            $this->put('marketing.ads', ['business_id' => $business->id, 'title' => '[Demo] Un espacio para ti · '.$business->name], [
                'description' => 'Explora los servicios y horarios de este negocio de demostración.', 'image_url' => $business->banner_url,
                'link_url' => $frontend.'/cliente/business/'.$business->id, 'placement' => 'HOME',
                'start_date' => $this->now->subDays(7)->toDateString(), 'end_date' => $this->now->addDays(60)->toDateString(),
                'status' => 'ACTIVE', 'budget' => null, 'spent' => 0, 'priority' => 1,
                'targeting' => $this->json(['demo_seed' => 'engagement-v1']), 'deleted_at' => null,
            ]);
            $promotionId = $this->put('marketing.promotions', ['business_id' => $business->id, 'promo_code' => 'DEMO-B'.($index + 1).'-10'], [
                'business_category_id' => $business->business_category_id, 'title' => '[Demo] Tu momento, con 10% de descuento',
                'description' => 'Promoción de demostración para '.$service->name.'. Revisa su vigencia antes de reservar.',
                'discount' => 10, 'type' => 'PERCENTAGE', 'min_purchase' => null, 'max_discount' => 20000,
                'per_user_limit' => 2, 'start_date' => $this->now->subDays(7)->toDateString(), 'end_date' => $this->now->addDays(60)->toDateString(),
                'usage_limit' => 100, 'is_active' => true,
            ]);
            $this->put('marketing.promotion_service', ['promotion_id' => $promotionId, 'service_id' => $service->id], ['discount' => 10, 'type' => 'PERCENTAGE']);
        }
    }

    private function onDemand(Business $business, \App\Modules\Business\Models\BusinessBranch $branch, Client $client, Professional $professional, Service $service, User $clientUser, User $professionalUser): int
    {
        $activeId = 0;
        foreach ([false, true] as $completed) {
            $start = $completed ? $this->now->subDays(2)->setTime(10, 0) : $this->now->subMinutes(15);
            $requestId = $this->put('on_demand.requests', ['request_code' => $completed ? 'DEMO-OD-DONE' : 'DEMO-OD-ACTIVE', 'client_id' => $client->id], [
                'client_id' => $client->id, 'business_id' => $business->id, 'service_id' => $service->id, 'professional_id' => $professional->id,
                'status' => $completed ? 'COMPLETED' : 'ACCEPTED',
                'description' => '[Demo] '.$service->name.' · '.($completed ? 'Experiencia finalizada' : 'Solicitud aceptada, lista para continuar el recorrido'),
                'metadata' => $this->json(['demo_seed' => 'engagement-v1']), 'currency' => 'COP',
                'estimated_price' => $service->price, 'final_price' => $completed ? $service->price : null,
                'client_lat' => $branch->lat, 'client_lng' => $branch->lng, 'client_address' => $branch->address,
                'professional_lat' => $branch->lat, 'professional_lng' => $branch->lng,
                'accepted_at' => $start->addMinutes(2), 'arrived_at' => $completed ? $start->addMinutes(12) : null,
                'started_at' => $completed ? $start->addMinutes(15) : null,
                'completed_at' => $completed ? $start->addMinutes(15 + $service->duration_minutes) : null,
                'cancelled_at' => null, 'cancellation_reason' => null, 'cancelled_by' => null,
                'search_timeout_seconds' => 300, 'search_expires_at' => $start->addMinutes(5),
                'created_at' => $start, 'deleted_at' => null,
            ]);
            if (! $completed) $activeId = $requestId;
            $this->put('on_demand.assignments', ['request_id' => $requestId, 'professional_id' => $professional->id], [
                'status' => 'ACCEPTED', 'offered_at' => $start, 'responded_at' => $start->addMinutes(2),
                'is_auto_assigned' => false, 'distance_km' => null, 'created_at' => $start,
            ]);
            $transitions = [
                [null, 'SEARCHING', $clientUser->id, $start],
                ['SEARCHING', 'ACCEPTED', $professionalUser->id, $start->addMinutes(2)],
            ];
            if ($completed) $transitions = array_merge($transitions, [
                ['ACCEPTED', 'ON_THE_WAY', $professionalUser->id, $start->addMinutes(5)],
                ['ON_THE_WAY', 'IN_PROGRESS', $professionalUser->id, $start->addMinutes(15)],
                ['IN_PROGRESS', 'COMPLETED', $professionalUser->id, $start->addMinutes(15 + $service->duration_minutes)],
            ]);
            foreach ($transitions as [$from, $to, $actor, $at]) {
                $this->put('on_demand.status_history', ['request_id' => $requestId, 'to_status' => $to, 'notes' => '[Demo] Historial de recorrido'], [
                    'from_status' => $from, 'changed_by' => $actor, 'metadata' => $this->json(['demo_seed' => 'engagement-v1']), 'created_at' => $at,
                ]);
            }
        }
        return $activeId;
    }

    private function chat(Collection $users, Business $business, int $requestId): void
    {
        $pairs = [
            ['[Demo] Tu servicio en '.$business->name, [DemoData::CLIENT_EMAIL, DemoData::PROFESSIONAL_EMAIL], $requestId,
                ['Hola, este es el chat de demostración para coordinar mi servicio.', '¡Hola! Aquí puedes revisar los mensajes del recorrido y continuar la conversación.']],
            ['[Demo] Coordinación del negocio', [DemoData::ADMIN_EMAIL, DemoData::SUPERADMIN_EMAIL], null,
                ['Dejé preparada la agenda y el catálogo de demostración.', 'Gracias. Los módulos ya pueden revisarse con las cuentas de cada rol.']],
        ];
        foreach ($pairs as [$subject, $emails, $request, $messages]) {
            $id = $this->put('chat.conversations', ['business_id' => $business->id, 'subject' => $subject], [
                'type' => 'DIRECT', 'on_demand_request_id' => $request, 'is_active' => true,
                'last_message_at' => $this->now->subMinutes(3), 'deleted_at' => null,
            ]);
            foreach ($emails as $index => $email) {
                $userId = $users[$email]->id;
                $this->put('chat.conversation_participants', ['conversation_id' => $id, 'user_id' => $userId], [
                    'last_read_at' => $this->now->subMinutes(8), 'is_muted' => false,
                ]);
                $this->put('chat.messages', ['conversation_id' => $id, 'sender_id' => $userId, 'content' => '[Demo] '.$messages[$index]], [
                    'message_type' => 'TEXT', 'attachments' => null, 'read_at' => null, 'is_edited' => false,
                    'created_at' => $this->now->subMinutes(4 - $index), 'deleted_at' => null,
                ]);
            }
        }
    }

    private function queues(Business $business, \App\Modules\Business\Models\BusinessBranch $branch, Client $client, Professional $professional, Service $service): void
    {
        $duration = max(1, (int) $service->duration_minutes);
        $queueId = $this->put('booking.smart_queues', ['business_id' => $business->id, 'name' => '[Demo] Atención sin cita'], [
            'branch_id' => $branch->id, 'status' => 'ACTIVE', 'current_number' => 2, 'estimated_wait_minutes' => $duration,
        ]);
        $others = Client::where('business_id', $business->id)->where('id', '!=', $client->id)->orderBy('id')->limit(2)->get();
        if ($others->count() !== 2) throw new \RuntimeException('El catálogo demo requiere al menos tres clientes en la sede principal.');
        foreach ([[$others[0]->id, 1, 'COMPLETED'], [$others[1]->id, 2, 'SERVING'], [$client->id, 3, 'WAITING']] as [$clientId, $number, $status]) {
            $this->put('booking.smart_queue_entries', ['queue_id' => $queueId, 'ticket_number' => $number], [
                'client_id' => $clientId, 'status' => $status, 'estimated_wait_minutes' => $status === 'WAITING' ? $duration : 0,
                'called_at' => $status === 'WAITING' ? null : $this->now->subMinutes($number === 1 ? $duration + 20 : 12),
                'served_at' => $status === 'WAITING' ? null : $this->now->subMinutes($number === 1 ? $duration + 15 : 10),
                'completed_at' => $status === 'COMPLETED' ? $this->now->subMinutes(15) : null,
                'created_at' => $this->now->subMinutes($duration + 30 - $number),
            ]);
        }
        // No public queue display/token is created: demo client identities stay private.
        foreach ([false, true] as $expired) {
            $this->put('booking.waitlists', ['business_id' => $business->id, 'client_id' => $client->id,
                'service_id' => $service->id, 'preferred_time_start' => $expired ? '13:15:00' : '10:15:00'], [
                'professional_id' => $professional->id, 'preferred_date' => ($expired ? $this->now->subDays(7) : $this->now->addDays(3))->toDateString(),
                'preferred_time_end' => $expired ? '14:15:00' : '12:15:00', 'status' => $expired ? 'EXPIRED' : 'PENDING',
                'notified_at' => null, 'expires_at' => $expired ? $this->now->subDays(6) : $this->now->addDays(4),
                'created_at' => $this->now->subDays($expired ? 10 : 1), 'deleted_at' => null,
            ]);
        }
    }

    private function gamification(User $clientUser, User $professionalUser, Collection $businesses): void
    {
        $ids = $businesses->pluck('id');
        $appointments = Appointment::whereIn('business_id', $ids)->where('source', 'demo')->where('booking_code', 'like', 'DEMO-%')
            ->where('status', 'COMPLETED')->with(['client', 'professional'])->get();
        foreach ($appointments as $appointment) {
            $earned = $appointment->completed_at ?? $appointment->date->setTime(12, 0);
            $recipients = [];
            if ($appointment->client?->user_id === $clientUser->id) $recipients[] = [$clientUser->id, 100];
            if ($appointment->professional?->user_id === $professionalUser->id) $recipients[] = [$professionalUser->id, 50];
            foreach ($recipients as [$userId, $points]) {
                $this->put('platform.gamification_xp', ['user_id' => $userId, 'action' => 'COMPLETE_APPOINTMENT',
                    'source_type' => Appointment::class, 'source_id' => $appointment->id], [
                    'points' => $points, 'description' => '[Demo] '.$points.' XP por experiencia completada · '.$appointment->booking_code,
                    'created_at' => $earned,
                ]);
            }
        }
        foreach ([['demo-primera-experiencia', 'Primer encuentro', 100, 'Sparkles'], ['demo-habito-de-cuidarte', 'El hábito de cuidarte', 500, 'Award'],
            ['demo-comunidad-constante', 'Comunidad constante', 1500, 'Crown']] as [$slug, $name, $required, $icon]) {
            $badgeId = $this->put('platform.gamification_badges', ['slug' => $slug], [
                'name' => '[Demo] '.$name, 'description' => 'Insignia de demostración por acumular '.$required.' XP en experiencias completadas.',
                'icon' => $icon, 'color' => '#176b50', 'category' => 'LOYALTY', 'required_points' => $required,
                'conditions' => $this->json(['min_xp' => $required, 'demo_seed' => 'engagement-v1']), 'is_active' => false,
            ]);
            foreach ([$clientUser, $professionalUser] as $user) {
                $xp = DB::table('platform.gamification_xp')->where('user_id', $user->id)->sum('points');
                if ($xp >= $required) $this->put('platform.user_badges', ['user_id' => $user->id, 'badge_id' => $badgeId], ['earned_at' => $this->now->subHour()]);
            }
        }
        foreach ($businesses as $business) {
            $sourceIds = $appointments->where('business_id', $business->id)->pluck('id');
            $ranking = DB::table('platform.gamification_xp')->whereIn('user_id', [$clientUser->id, $professionalUser->id])
                ->where('source_type', Appointment::class)->whereIn('source_id', $sourceIds)
                ->whereBetween('created_at', [$this->now->startOfMonth(), $this->now->endOfMonth()])
                ->selectRaw('user_id, SUM(points) AS points, COUNT(DISTINCT source_id) AS appointments')->groupBy('user_id')
                ->orderByDesc('points')->orderBy('user_id')->get();
            foreach ($ranking as $index => $entry) {
                $spent = $appointments->where('business_id', $business->id)->where('currency', 'COP')
                    ->filter(fn ($appointment) => $appointment->client?->user_id === $entry->user_id && $appointment->payment_status === 'PAID'
                        && $appointment->date->between($this->now->startOfMonth(), $this->now->endOfMonth()))
                    ->sum(fn ($appointment) => Money::minor($appointment->final_price));
                $this->put('platform.leaderboards', ['business_id' => $business->id, 'user_id' => $entry->user_id, 'type' => 'BUSINESS', 'period' => 'MONTH'], [
                    'period_start' => $this->now->startOfMonth()->toDateString(), 'period_end' => $this->now->endOfMonth()->toDateString(),
                    'rank' => $index + 1, 'total_points' => (int) $entry->points, 'appointments_count' => (int) $entry->appointments,
                    'total_spent' => Money::decimal($spent),
                ]);
            }
        }
    }

    private function recommendations(User $user, Collection $businesses): void
    {
        $history = Appointment::whereIn('business_id', $businesses->pluck('id'))->where('source', 'demo')
            ->whereHas('client', fn ($clients) => $clients->where('user_id', $user->id))->pluck('business_id')->unique();
        $counts = Appointment::whereIn('business_id', $businesses->pluck('id'))->where('source', 'demo')
            ->selectRaw('business_id, COUNT(*) AS total')->groupBy('business_id')->pluck('total', 'business_id');
        $maximum = max(1, $counts->max() ?? 0);
        foreach ($businesses as $business) {
            $factors = ['distance_score' => 0, 'rating_score' => min(1, (float) $business->rating / 5),
                'popularity_score' => ($counts[$business->id] ?? 0) / $maximum, 'history_score' => $history->contains($business->id) ? 1 : 0];
            $score = round($factors['rating_score'] * .25 + $factors['popularity_score'] * .20 + $factors['history_score'] * .25, 4);
            $this->put('platform.recommendation_logs', ['user_id' => $user->id, 'recommendable_type' => Business::class,
                'recommendable_id' => $business->id, 'algorithm' => 'demo_weighted_multi_factor'], [
                'recommendation_type' => 'BUSINESS', 'score' => $score, 'factors' => $this->json($factors),
                'was_clicked' => false, 'was_booked' => false, 'clicked_at' => null, 'booked_at' => null,
            ]);
        }
    }

    private function configuration(User $admin, Business $business, Service $service): void
    {
        $identity = ['user_id' => $admin->id, 'name' => '[Demo] Integración desactivada'];
        $secret = DB::table('platform.outgoing_webhooks')->where($identity)->value('secret') ?? Str::random(64);
        $this->put('platform.outgoing_webhooks', $identity, [
            'url' => 'https://example.invalid/habitu-demo', 'secret' => $secret,
            'events' => $this->json(['appointment.created', 'appointment.cancelled']), 'active' => false, 'timeout' => 5, 'retry_count' => 0,
        ]);
        $this->put('platform.feature_flags', ['name' => 'demo_experiencia_local'], [
            'enabled' => false, 'user_percentage' => 0, 'description' => 'Ejemplo de demostración sin funcionalidad operativa asociada.',
        ]);
        $this->put('platform.dynamic_pricing_rules', ['business_id' => $business->id, 'service_id' => $service->id, 'rule_type' => 'PEAK_HOUR', 'priority' => 9101], [
            'conditions' => $this->json(['hour_start' => 17, 'hour_end' => 19, 'demo_seed' => 'engagement-v1']),
            'multiplier' => '1.10', 'flat_adjustment' => null, 'is_active' => false,
            'starts_at' => $this->now->startOfDay(), 'ends_at' => $this->now->addDays(60)->endOfDay(),
        ]);
    }

    private function assistantExample(User $user, Business $business): void
    {
        $id = $this->put('platform.ai_conversations', ['session_id' => 'demo-example-client-booking', 'user_id' => $user->id], [
            'user_id' => $user->id, 'context_type' => 'BOOKING', 'status' => 'ACTIVE',
            'context_data' => $this->json(['demo_seed' => 'engagement-v1', 'business_id' => $business->id, 'example_only' => true]),
            'last_activity_at' => $this->now->subHour(),
        ]);
        foreach ([['user', '[Ejemplo de demostración] ¿Dónde reviso la disponibilidad?'],
            ['assistant', '[Respuesta de ejemplo, escrita para esta demostración; no generada por IA] Abre Explorar, elige un negocio y selecciona Reservar. El formulario consulta los horarios disponibles antes de confirmar.']] as $index => [$role, $content]) {
            $this->put('platform.ai_messages', ['conversation_id' => $id, 'role' => $role, 'content' => $content], [
                'metadata' => $this->json(['demo_seed' => 'engagement-v1', 'example_only' => true]), 'tool_calls' => null,
                'created_at' => $this->now->subMinutes(62 - $index),
            ]);
        }
    }

    private function put(string $table, array $identity, array $values): int
    {
        $query = DB::table($table)->where($identity);
        $id = $query->value('id');
        $values['updated_at'] = $this->now;
        if ($id !== null) {
            $query->update($values);
            return (int) $id;
        }
        return (int) DB::table($table)->insertGetId(array_merge($identity, ['created_at' => $this->now], $values));
    }

    private function json(array $data): string
    {
        return json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    }
}
