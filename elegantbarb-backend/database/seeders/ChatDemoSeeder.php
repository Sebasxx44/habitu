<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChatDemoSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $clientUserId = DB::table('public.users')->where('email', 'cliente@elegantbarb.com')->value('id');
        $profUserId = DB::table('public.users')->where('email', 'professional@elegantbarb.com')->value('id');
        $mariaUserId = DB::table('public.users')->where('email', 'maria@elegantbarb.com')->value('id');

        if (! $clientUserId || ! $profUserId) {
            $this->command->warn('ChatDemoSeeder: faltan usuarios demo.');
            return;
        }

        // Conversation 1: Cliente <-> Profesional
        $conv1 = DB::table('chat.conversations')->insertGetId([
            'type' => 'PRIVATE',
            'subject' => 'Carlos Mendoza',
            'created_at' => $now->copy()->subDays(2),
            'updated_at' => $now,
        ]);

        DB::table('chat.conversation_participants')->insert([
            ['conversation_id' => $conv1, 'user_id' => $clientUserId, 'created_at' => $now->copy()->subDays(2), 'last_read_at' => $now, 'created_at' => $now],
            ['conversation_id' => $conv1, 'user_id' => $profUserId, 'created_at' => $now->copy()->subDays(2), 'last_read_at' => $now->copy()->subHours(1), 'created_at' => $now],
        ]);

        $messages1 = [
            ['sender_id' => $clientUserId, 'content' => 'Hola Carlos, ¿tienes disponibilidad para mañana?', 'created_at' => $now->copy()->subDays(2)],
            ['sender_id' => $profUserId, 'content' => '¡Hola Juan! Sí, tengo cupo a las 10am y 3pm. ¿Cuál te funciona?', 'created_at' => $now->copy()->subDays(2)->addMinutes(5)],
            ['sender_id' => $clientUserId, 'content' => 'Perfecto, me quedo con las 3pm. Gracias!', 'created_at' => $now->copy()->subDays(2)->addMinutes(10)],
            ['sender_id' => $profUserId, 'content' => 'Agendado. Nos vemos mañana a las 3pm. 👍', 'created_at' => $now->copy()->subDays(2)->addMinutes(15)],
            ['sender_id' => $clientUserId, 'content' => 'Carlos, llegaré 10 min tarde, disculpa.', 'created_at' => $now->copy()->subHours(3)],
            ['sender_id' => $profUserId, 'content' => 'No hay problema, te espero.', 'created_at' => $now->copy()->subHours(2)],
        ];

        foreach ($messages1 as $msg) {
            DB::table('chat.messages')->insert([
                'conversation_id' => $conv1,
                'sender_id' => $msg['sender_id'],
                'content' => $msg['content'],
                'message_type' => 'TEXT',
                'created_at' => $msg['created_at'],
                'updated_at' => $msg['created_at'],
            ]);
        }

        // Conversation 2: Cliente <-> María (otra cliente)
        if ($mariaUserId) {
            $conv2 = DB::table('chat.conversations')->insertGetId([
                'type' => 'PRIVATE',
                'subject' => 'María García',
                'created_at' => $now->copy()->subDay(),
                'updated_at' => $now,
            ]);

            DB::table('chat.conversation_participants')->insert([
                ['conversation_id' => $conv2, 'user_id' => $clientUserId, 'created_at' => $now->copy()->subDay(), 'last_read_at' => $now, 'created_at' => $now],
                ['conversation_id' => $conv2, 'user_id' => $mariaUserId, 'created_at' => $now->copy()->subDay(), 'last_read_at' => $now->copy()->subHours(2), 'created_at' => $now],
            ]);

            $messages2 = [
                ['sender_id' => $mariaUserId, 'content' => 'Hola Juan, ¿has probado el nuevo spa?', 'created_at' => $now->copy()->subDay()],
                ['sender_id' => $clientUserId, 'content' => '¡Sí! Fue increíble. Te lo recomiendo mucho.', 'created_at' => $now->copy()->subDay()->addMinutes(20)],
                ['sender_id' => $mariaUserId, 'content' => 'Genial, voy a reservar entonces. Gracias!', 'created_at' => $now->copy()->subHours(5)],
            ];

            foreach ($messages2 as $msg) {
                DB::table('chat.messages')->insert([
                    'conversation_id' => $conv2,
                    'sender_id' => $msg['sender_id'],
                    'content' => $msg['content'],
                    'message_type' => 'TEXT',
                    'created_at' => $msg['created_at'],
                    'updated_at' => $msg['created_at'],
                ]);
            }
        }

        // Group conversation
        $conv3 = DB::table('chat.conversations')->insertGetId([
            'type' => 'GROUP',
            'subject' => 'Soporte ElegantBarb',
            'created_at' => $now->copy()->subDays(5),
            'updated_at' => $now,
        ]);

        DB::table('chat.conversation_participants')->insert([
            ['conversation_id' => $conv3, 'user_id' => $clientUserId, 'created_at' => $now->copy()->subDays(5), 'last_read_at' => $now, 'created_at' => $now],
            ['conversation_id' => $conv3, 'user_id' => $profUserId, 'created_at' => $now->copy()->subDays(5), 'last_read_at' => $now, 'created_at' => $now],
        ]);

        DB::table('chat.messages')->insert([
            'conversation_id' => $conv3,
            'sender_id' => $profUserId,
            'content' => 'Bienvenidos al grupo de soporte. Aquí resolvemos dudas.',
            'message_type' => 'TEXT',
            'created_at' => $now->copy()->subDays(5),
            'updated_at' => $now->copy()->subDays(5),
        ]);

        $this->command->info('ChatDemoSeeder: 3 conversaciones + mensajes creados.');
    }
}
