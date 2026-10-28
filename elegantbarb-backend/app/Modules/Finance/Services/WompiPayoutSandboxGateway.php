<?php

declare(strict_types=1);

namespace App\Modules\Finance\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

final class WompiPayoutSandboxGateway
{
    private const URL = 'https://api.sandbox.payouts.wompi.co/v1';

    public function enabled(): bool
    {
        return (bool) config('payouts.sandbox_enabled') && config('payouts.api_key') && config('payouts.principal_id')
            && config('payouts.source_account_id') && config('payouts.test_bank_id');
    }

    public function assertEnabled(): void
    {
        abort_unless($this->enabled(), 503, 'El adaptador sandbox requiere habilitación y credenciales de prueba. Las transferencias reales están deshabilitadas.');
    }

    private function client(): PendingRequest
    {
        $this->assertEnabled();
        return Http::baseUrl(self::URL)->acceptJson()->asJson()->connectTimeout(5)->timeout(15)
            ->withOptions(['allow_redirects' => false])->withHeaders(['x-api-key' => (string) config('payouts.api_key'), 'user-principal-id' => (string) config('payouts.principal_id')]);
    }

    public function validatedSource(int $amount): array
    {
        // Response exceptions are replaced with fixed text: never log bank payloads or credentials.
        try {
            $accounts = $this->client()->get('/accounts', ['status' => 'ACTIVE']);
            $banks = $this->client()->get('/banks');
            if (! $accounts->successful() || ! $banks->successful()) throw new \RuntimeException();
            $source = collect($accounts->json('data', []))->first(fn ($row) => ($row['id'] ?? '') === config('payouts.source_account_id'));
            $bank = collect($banks->json())->first(fn ($row) => ($row['id'] ?? '') === config('payouts.test_bank_id'));
            if (! $source || ($source['status'] ?? '') !== 'ACTIVE' || ! is_int($source['balanceInCents'] ?? null)
                || $source['balanceInCents'] < $amount || ! $bank || ! is_string($bank['code'] ?? null)) throw new \RuntimeException();
            return ['account_id' => $source['id'], 'bank_id' => $bank['id'], 'bank_code' => $bank['code']];
        } catch (\Throwable) {
            throw ValidationException::withMessages(['provider' => 'No se pudo validar cuenta origen activa, saldo sandbox y banco destinatario.']);
        }
    }

    public function submit(array $payload, string $key): ?string
    {
        try {
            $response = $this->client()->withHeaders(['idempotency-key' => $key])->post('/payouts', $payload);
            $id = $response->json('data.payoutId');
            return $response->successful() && is_string($id) && \Illuminate\Support\Str::isUuid($id) ? $id : null;
        } catch (\Throwable) { return null; }
    }

    public function lookup(string $reference): ?array
    {
        try {
            $transactions = $this->client()->get('/transactions/'.rawurlencode($reference), ['limit' => 2, 'page' => 1]);
            $payouts = $this->client()->get('/payouts', ['reference' => $reference, 'limit' => 2, 'page' => 1]);
            if (! $transactions->successful() || ! $payouts->successful()) return null;
            $tx = $transactions->json('data'); $batch = $payouts->json('data');
            if (! is_array($tx) || ! is_array($batch) || ! is_array($tx['records'] ?? null) || ! is_array($batch['records'] ?? null)
                || ! is_int($tx['total'] ?? null) || ! is_int($batch['total'] ?? null)) return ['invalid' => true];
            if (! array_is_list($tx['records']) || ! array_is_list($batch['records']) || $tx['total'] < 0 || $batch['total'] < 0) return ['invalid' => true];
            foreach (array_merge($tx['records'], $batch['records']) as $record) if (! is_array($record) || ! is_string($record['status'] ?? null)) return ['invalid' => true];
            return ['transactions' => $tx, 'payouts' => $batch];
        } catch (\Throwable) { return null; }
    }
}
