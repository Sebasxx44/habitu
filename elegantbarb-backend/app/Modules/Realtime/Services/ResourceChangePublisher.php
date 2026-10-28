<?php

namespace App\Modules\Realtime\Services;

use App\Models\User;
use App\Modules\Realtime\Events\ResourceChanged;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

final class ResourceChangePublisher
{
    private bool $batching = false;
    private array $pending = [];

    public function begin(): void
    {
        $this->batching = true;
        $this->pending = [];
    }

    public function capture(Model $model): void
    {
        $table = $model->getTable();
        if (!config('realtime.enabled') || !array_key_exists($table, config('realtime.tables', []))) return;
        $identityFields = array_fill_keys(['id', 'user_id', 'owner_user_id', 'sender_id', 'business_id', 'barber_shop_id', 'client_id', 'professional_id', 'branch_id', 'wallet_id', 'queue_id', 'request_id', 'on_demand_request_id', 'appointment_id', 'conversation_id', 'membership_plan_id', 'client_membership_id', 'promotion_id', 'loyalty_card_id'], true);
        $attributes = array_intersect_key($model->getAttributes(), $identityFields);
        $previous = array_intersect_key($model->getRawOriginal(), $identityFields);
        // Resolve identities from the pre-update values as well (reassignments must refresh both sides).
        $commit = fn () => $this->record($table, [$attributes, $previous]);
        if ($model->getConnection()->transactionLevel() > 0) $model->getConnection()->afterCommit($commit);
        else $commit();
    }

    public function record(string $table, array $records): void
    {
        if (!config('realtime.enabled')) return;
        $this->pending[$table.':'.hash('sha256', json_encode($records))] = [$table, $records];
        if (!$this->batching) $this->flush();
    }

    public function finish(bool $success, ?User $actor = null, array $tables = []): void
    {
        if ($success && $actor) {
            foreach (array_unique($tables) as $table) {
                // Covers bulk updates and pivot writes which bypass Eloquent model events.
                $this->pending[] = [$table, [['user_id' => $actor->id, 'business_id' => $actor->barber_shop_id]]];
            }
        }
        $this->batching = false;
        // Model callbacks only enter this buffer after commit, even if a later response fails.
        $this->flush();
    }

    public function flush(): void
    {
        $changes = $this->pending;
        $this->pending = [];
        if (!$changes || !config('realtime.enabled')) return;
        try {
            $audiences = [];
            foreach ($changes as [$table, $records]) {
                $topics = config('realtime.tables', [])[$table] ?? [];
                if (!$topics) continue;
                $channels = ['platform'];
                if (in_array($table, ['roles', 'permissions', 'role_permissions'], true)) $channels[] = 'accounts';
                $businessIds = [];
                foreach ($records as $record) {
                    [$users, $businesses] = $this->identities($table, $record);
                    foreach ($users as $id) if ($id) $channels[] = 'user.'.$id;
                    foreach ($businesses as $id) if ($id) { $channels[] = 'business.'.$id; $businessIds[] = $id; }
                }
                if (in_array($table, config('realtime.public_tables', []), true)) $channels[] = 'marketplace';
                foreach (array_unique($channels) as $channel) $audiences[$channel] = array_unique([...($audiences[$channel] ?? []), ...$topics]);
                if (in_array('availability', $topics, true)) {
                    foreach (array_unique($businessIds) as $id) $audiences['availability.'.$id] = ['availability'];
                }
            }
            foreach ($audiences as $channel => $topics) event(new ResourceChanged(array_values($topics), [$channel]));
        } catch (\Throwable $error) {
            // A temporary queue/broadcast outage must never undo an already committed booking/payment.
            report($error);
        }
    }

    private function identities(string $table, array $record): array
    {
        $users = array_filter([$record['user_id'] ?? null, $record['owner_user_id'] ?? null, $record['sender_id'] ?? null]);
        $businesses = array_filter([$record['business_id'] ?? null]);
        if ($table === 'users') { $users[] = $record['id'] ?? null; $businesses[] = $record['barber_shop_id'] ?? null; }
        if ($table === 'business.businesses') $businesses[] = $record['id'] ?? null;
        if (!empty($record['branch_id'])) $businesses[] = DB::table('business.business_branches')->where('id', $record['branch_id'])->value('business_id');
        if (!empty($record['wallet_id'])) $users[] = DB::table('finance.wallets')->where('id', $record['wallet_id'])->value('user_id');
        if (!empty($record['queue_id'])) $businesses[] = DB::table('booking.smart_queues')->where('id', $record['queue_id'])->value('business_id');
        foreach (['membership_plan_id' => 'subscriptions.membership_plans', 'client_membership_id' => 'subscriptions.client_memberships',
            'promotion_id' => 'marketing.promotions', 'loyalty_card_id' => 'loyalty.loyalty_cards'] as $field => $relatedTable) {
            if (empty($record[$field])) continue;
            $parent = DB::table($relatedTable)->where('id', $record[$field])->first();
            if ($parent) { [$parentUsers, $parentBusinesses] = $this->identities($relatedTable, (array) $parent); $users = [...$users, ...$parentUsers]; $businesses = [...$businesses, ...$parentBusinesses]; }
        }
        if (!empty($record['on_demand_request_id']) || (!empty($record['request_id']) && str_starts_with($table, 'on_demand.'))) {
            $parent = DB::table('on_demand.requests')->where('id', $record['on_demand_request_id'] ?? $record['request_id'])->first();
            if ($parent) { [$parentUsers, $parentBusinesses] = $this->identities('on_demand.requests', (array) $parent); $users = [...$users, ...$parentUsers]; $businesses = [...$businesses, ...$parentBusinesses]; }
        }
        if (!empty($record['appointment_id']) && $table !== 'booking.appointments') {
            $parent = DB::table('booking.appointments')->where('id', $record['appointment_id'])->first();
            if ($parent) { [$parentUsers, $parentBusinesses] = $this->identities('booking.appointments', (array) $parent); $users = [...$users, ...$parentUsers]; $businesses = [...$businesses, ...$parentBusinesses]; }
        }
        foreach (['client_id' => 'people.clients', 'professional_id' => 'people.professionals'] as $field => $relatedTable) {
            if (empty($record[$field])) continue;
            $person = DB::table($relatedTable)->where('id', $record[$field])->first(['user_id', 'business_id']);
            if ($person) { $users[] = $person->user_id; $businesses[] = $person->business_id; }
        }
        if (!empty($record['conversation_id'])) $users = [...$users, ...DB::table('chat.conversation_participants')->where('conversation_id', $record['conversation_id'])->pluck('user_id')->all()];
        if ($table === 'tracking.location_updates' && !empty($record['professional_id'])) {
            $clientIds = DB::table('on_demand.requests')->where('professional_id', $record['professional_id'])->whereIn('status', ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'])->pluck('client_id');
            $users = [...$users, ...DB::table('people.clients')->whereIn('id', $clientIds)->pluck('user_id')->all()];
        }
        $businesses = array_values(array_unique(array_map('intval', array_filter($businesses))));
        if ($businesses) $users = [...$users, ...DB::table('business.businesses')->whereIn('id', $businesses)->pluck('owner_user_id')->all()];
        return [array_values(array_unique(array_map('intval', array_filter($users)))), $businesses];
    }
}
