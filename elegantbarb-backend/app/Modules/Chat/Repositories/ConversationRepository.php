<?php

namespace App\Modules\Chat\Repositories;

use App\Modules\Chat\Models\Conversation;
use App\Repositories\BaseRepository;
use Illuminate\Support\Facades\DB;

class ConversationRepository extends BaseRepository
{
    public function __construct(Conversation $model)
    {
        parent::__construct($model);
    }

    public function getForUser(int $userId, int $limit = 20)
    {
        return $this->model
            ->forUser($userId)
            ->with([
                'participants.user:id,name',
                'messages' => fn ($q) => $q->where('created_at', '>=', now()->subDays(90))->latest()->limit(1),
                'messages.sender:id,name',
            ])
            ->orderByDesc('last_message_at')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    public function findBetweenUsers(int $userA, int $userB): ?Conversation
    {
        return $this->model
            ->where('type', 'DIRECT')
            ->whereHas('participants', fn ($q) => $q->where('user_id', $userA))
            ->whereHas('participants', fn ($q) => $q->where('user_id', $userB))
            ->whereHas('participants', fn ($q) => $q->selectRaw('COUNT(*)')->havingRaw('COUNT(*) = 2'), '=', 1)
            ->with('participants')
            ->first();
    }

    public function getOrCreateDirect(int $userA, int $userB): Conversation
    {
        $conversation = $this->findBetweenUsers($userA, $userB);

        if ($conversation) {
            return $conversation;
        }

        return DB::transaction(function () use ($userA, $userB) {
            $conversation = $this->model->create([
                'type' => 'DIRECT',
                'is_active' => true,
            ]);

            $conversation->participants()->createMany([
                ['user_id' => $userA],
                ['user_id' => $userB],
            ]);

            return $conversation->load('participants');
        });
    }
}
