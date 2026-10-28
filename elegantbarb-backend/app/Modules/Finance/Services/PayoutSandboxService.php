<?php

declare(strict_types=1);

namespace App\Modules\Finance\Services;

use App\Core\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class PayoutSandboxService
{
    public function __construct(private readonly WompiPayoutSandboxGateway $gateway) {}

    public function prepare(int $withdrawalId, int $actorId): object
    {
        $this->gateway->assertEnabled();
        $withdrawal = DB::table('finance.withdrawals')->where('id', $withdrawalId)->firstOrFail();
        abort_unless($withdrawal->status === 'PENDING', 409, 'La solicitud debe seguir pendiente.');
        $existing = DB::table('finance.payout_sandbox_attempts')->where('withdrawal_id', $withdrawalId)->first();
        if ($existing) return $existing;
        $amount = Money::minor((string) $withdrawal->amount);
        $source = $this->gateway->validatedSource($amount);
        $id = (string) Str::uuid();
        $reference = 'habitu-sandbox-'.$id;
        $payload = ['reference' => $reference, 'accountId' => $source['account_id'], 'paymentType' => 'OTHER', 'transactions' => [[
            'legalIdType' => 'CC', 'legalId' => '1000000000', 'bankId' => $source['bank_id'], 'accountType' => 'AHORROS',
            'accountNumber' => config('payouts.test_account_number'), 'name' => 'Habitu Sandbox', 'personType' => 'NATURAL',
            'email' => 'sandbox@example.invalid', 'amount' => $amount, 'reference' => $reference]]];
        return DB::transaction(function () use ($withdrawalId, $actorId, $payload, $source, $id, $reference, $amount) {
            $withdrawal = DB::table('finance.withdrawals')->where('id', $withdrawalId)->lockForUpdate()->firstOrFail();
            abort_unless($withdrawal->status === 'PENDING' && Money::minor((string) $withdrawal->amount) === $amount, 409);
            $existing = DB::table('finance.payout_sandbox_attempts')->where('withdrawal_id', $withdrawalId)->first();
            if ($existing) return $existing;
            $json = json_encode(['request' => $payload, 'bank_code' => $source['bank_code'], 'principal_hash' => hash('sha256', (string) config('payouts.principal_id'))], JSON_THROW_ON_ERROR);
            DB::table('finance.payout_sandbox_attempts')->insert(['id' => $id, 'withdrawal_id' => $withdrawalId, 'prepared_by' => $actorId,
                'reference' => $reference, 'encrypted_payload' => Crypt::encryptString($json), 'payload_hash' => hash('sha256', $json), 'created_at' => now(), 'updated_at' => now()]);
            $this->audit($id, $actorId, 'READY', 'SYNTHETIC_RECIPIENT_VALIDATED');
            return $this->row($id);
        });
    }

    public function submit(string $id, int $actorId): object
    {
        $this->gateway->assertEnabled();
        $attempt = $this->row($id);
        $this->snapshot($attempt);
        if ($attempt->state === 'SUBMITTING' && $attempt->last_submitted_at && CarbonImmutable::parse($attempt->last_submitted_at)->addMinute()->gt(now())) return $attempt;
        $absent = false;
        if ($attempt->first_submitted_at) {
            $result = $this->reconcile($id, $actorId);
            $attempt = $this->row($id);
            $absent = $result['absent'];
            if (! $absent || $attempt->state === 'REVIEW') return $attempt;
        }
        $attempt = DB::transaction(function () use ($id, $actorId, $absent) {
            $attempt = $this->row($id, true);
            if ($attempt->first_submitted_at && CarbonImmutable::parse($attempt->first_submitted_at)->addHours(24)->lte(now())) {
                $this->transition($id, $actorId, 'REVIEW', 'IDEMPOTENCY_WINDOW_EXPIRED');
                return null;
            }
            abort_unless($attempt->state === 'READY' || ($absent && in_array($attempt->state, ['UNCERTAIN', 'SUBMITTING'], true)), 409, 'Conciliar el intento antes de enviar.');
            abort_if($attempt->last_submitted_at && CarbonImmutable::parse($attempt->last_submitted_at)->addMinute()->gt(now()), 409, 'El envío anterior sigue protegido contra reintentos simultáneos.');
            $withdrawal = DB::table('finance.withdrawals')->where('id', $attempt->withdrawal_id)->firstOrFail();
            abort_unless($withdrawal->status === 'PENDING', 409, 'La solicitud original ya no está pendiente.');
            DB::table('finance.payout_sandbox_attempts')->where('id', $id)->update(['first_submitted_at' => $attempt->first_submitted_at ?? now(), 'last_submitted_at' => now()]);
            $this->transition($id, $actorId, 'SUBMITTING', null);
            return $attempt;
        });
        if (! $attempt) return $this->row($id);
        $snapshot = $this->snapshot($attempt);
        $payoutId = $this->gateway->submit($snapshot['request'], $attempt->id);
        DB::transaction(function () use ($id, $actorId, $payoutId) {
            $current = $this->row($id, true);
            // A concurrent verified reconciliation may already have advanced the attempt.
            if ($current->state !== 'SUBMITTING') return;
            if ($payoutId) DB::table('finance.payout_sandbox_attempts')->where('id', $id)->update(['provider_payout_id' => $payoutId]);
            $this->transition($id, $actorId, $payoutId ? 'PROCESSING' : 'UNCERTAIN', $payoutId ? 'AWAITING_SERVER_RECONCILIATION' : 'RESPONSE_NOT_VERIFIED');
        });
        return $this->row($id);
    }

    public function reconcile(string $id, int $actorId): array
    {
        $this->gateway->assertEnabled();
        $attempt = $this->row($id);
        if (! $attempt->first_submitted_at || in_array($attempt->state, ['APPROVED', 'FAILED'], true)) return ['attempt' => $attempt, 'absent' => false];
        $this->snapshot($attempt);
        if ($attempt->state === 'SUBMITTING' && $attempt->last_submitted_at && CarbonImmutable::parse($attempt->last_submitted_at)->addMinute()->gt(now())) return ['attempt' => $attempt, 'absent' => false];
        $result = $this->gateway->lookup($attempt->reference);
        return DB::transaction(function () use ($id, $actorId, $result) {
            $attempt = $this->row($id, true);
            if (in_array($attempt->state, ['APPROVED', 'FAILED'], true)) return ['attempt' => $attempt, 'absent' => false];
            if ($result === null) {
                $this->transition($id, $actorId, $attempt->state === 'REVIEW' ? 'REVIEW' : 'UNCERTAIN', 'LOOKUP_UNAVAILABLE');
                return ['attempt' => $this->row($id), 'absent' => false];
            }
            if (isset($result['invalid'])) {
                $this->transition($id, $actorId, 'REVIEW', 'MALFORMED_PROVIDER_RESPONSE');
                return ['attempt' => $this->row($id), 'absent' => false];
            }
            DB::table('finance.payout_sandbox_attempts')->where('id', $id)->update(['reconciled_at' => now()]);
            $transactions = $result['transactions']; $batches = $result['payouts'];
            $absent = $transactions['total'] === 0 && $batches['total'] === 0 && $transactions['records'] === [] && $batches['records'] === [];
            if ($absent) {
                if ($attempt->provider_payout_id || $attempt->state === 'REVIEW') {
                    $this->transition($id, $actorId, 'REVIEW', 'KNOWN_OR_REVIEWED_PAYOUT_MISSING');
                    return ['attempt' => $this->row($id), 'absent' => false];
                }
                $expired = CarbonImmutable::parse($attempt->first_submitted_at)->addHours(24)->lte(now());
                $this->transition($id, $actorId, $expired ? 'REVIEW' : 'UNCERTAIN', $expired ? 'IDEMPOTENCY_WINDOW_EXPIRED' : 'NOT_FOUND_WITHIN_IDEMPOTENCY_WINDOW');
                return ['attempt' => $this->row($id), 'absent' => ! $expired];
            }
            if ($batches['total'] !== 1 || count($batches['records']) !== 1 || $transactions['total'] > 1 || $transactions['total'] !== count($transactions['records'])) {
                $this->transition($id, $actorId, 'REVIEW', 'AMBIGUOUS_PROVIDER_RECORDS');
                return ['attempt' => $this->row($id), 'absent' => false];
            }
            $snapshot = $this->snapshot($attempt); $request = $snapshot['request']; $recipient = $request['transactions'][0]; $batch = $batches['records'][0];
            if (($batch['reference'] ?? '') !== $attempt->reference || ($batch['amountInCents'] ?? null) !== $recipient['amount'] || ($batch['totalTransactions'] ?? null) !== 1
                || ! Str::isUuid($batch['id'] ?? '') || ($attempt->provider_payout_id && $batch['id'] !== $attempt->provider_payout_id)) {
                $this->transition($id, $actorId, 'REVIEW', 'PAYOUT_MISMATCH');
                return ['attempt' => $this->row($id), 'absent' => false];
            }
            DB::table('finance.payout_sandbox_attempts')->where('id', $id)->update(['provider_payout_id' => $batch['id']]);
            if ($transactions['total'] === 0) {
                $this->transition($id, $actorId, 'PROCESSING', 'AWAITING_TRANSACTION');
                return ['attempt' => $this->row($id), 'absent' => false];
            }
            $transaction = $transactions['records'][0]; $payee = is_array($transaction['payeeInfo'] ?? null) ? $transaction['payeeInfo'] : [];
            $matches = ($transaction['reference'] ?? '') === $attempt->reference && ($transaction['amountInCents'] ?? null) === $recipient['amount'] && Str::isUuid($transaction['id'] ?? '')
                && ($payee['bankCode'] ?? '') === $snapshot['bank_code'];
            foreach (['legalIdType', 'legalId', 'accountType', 'accountNumber', 'name', 'email'] as $key) $matches = $matches && ($payee[$key] ?? null) === $recipient[$key];
            if (! $matches) {
                $this->transition($id, $actorId, 'REVIEW', 'RECIPIENT_OR_AMOUNT_MISMATCH');
                return ['attempt' => $this->row($id), 'absent' => false];
            }
            $status = $transaction['status'] ?? '';
            $state = match ($status) { 'APPROVED' => 'APPROVED', 'FAILED', 'CANCELLED', 'REJECTED' => 'FAILED', 'PENDING', 'PROCESSING', 'ADDED_TO_FILE' => 'PROCESSING', default => 'REVIEW' };
            DB::table('finance.payout_sandbox_attempts')->where('id', $id)->update(['provider_transaction_id' => $transaction['id'], 'provider_status' => substr($status, 0, 40)]);
            $this->transition($id, $actorId, $state, 'SANDBOX_SERVER_VERIFIED');
            return ['attempt' => $this->row($id), 'absent' => false];
        });
    }

    public function present(object $row): array
    {
        return ['id' => $row->id, 'withdrawal_id' => $row->withdrawal_id, 'state' => $row->state, 'reference' => $row->reference,
            'provider_payout_id' => $row->provider_payout_id, 'provider_transaction_id' => $row->provider_transaction_id, 'provider_status' => $row->provider_status,
            'resolution' => $row->resolution, 'first_submitted_at' => $row->first_submitted_at ? CarbonImmutable::parse($row->first_submitted_at)->toIso8601String() : null, 'reconciled_at' => $row->reconciled_at ? CarbonImmutable::parse($row->reconciled_at)->toIso8601String() : null, 'environment' => 'SANDBOX', 'real_transfer_confirmed' => false];
    }
    private function row(string $id, bool $lock = false): object
    {
        return DB::table('finance.payout_sandbox_attempts')->where('id', $id)->when($lock, fn ($query) => $query->lockForUpdate())->firstOrFail();
    }
    private function snapshot(object $attempt): array
    {
        $json = Crypt::decryptString($attempt->encrypted_payload);
        abort_unless(hash_equals($attempt->payload_hash, hash('sha256', $json)), 409);
        $snapshot = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        abort_unless(hash_equals($snapshot['principal_hash'], hash('sha256', (string) config('payouts.principal_id'))), 409, 'La cuenta principal configurada cambió; requiere revisión.');
        return $snapshot;
    }
    private function transition(string $id, int $actorId, string $state, ?string $resolution): void
    {
        DB::table('finance.payout_sandbox_attempts')->where('id', $id)->update(['state' => $state, 'resolution' => $resolution, 'updated_at' => now()]);
        $this->audit($id, $actorId, $state, $resolution);
    }
    private function audit(string $id, int $actorId, string $state, ?string $resolution): void
    {
        DB::table('finance.payout_sandbox_events')->insert(['attempt_id' => $id, 'actor_id' => $actorId, 'state' => $state, 'resolution' => $resolution, 'created_at' => now()]);
    }
}
