<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Core\DTOs\ServiceResponse;
use App\Core\Support\Money;
use App\Modules\Analytics\Services\AnalyticsPeriod;
use App\Modules\Finance\Services\EarningsAnalyticsService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EarningsController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = $request->user();
        $period = AnalyticsPeriod::fromRequest($request);
        $now = CarbonImmutable::now(config('booking.timezone', 'America/Bogota'));
        $professional = DB::table('people.professionals')->where('user_id', $user->id)->first();
        
        if (! $professional) {
            return ServiceResponse::error('Profesional no encontrado', null, 404)->toJsonResponse();
        }

        $wallet = DB::table('finance.wallets')->where('user_id', $user->id)->first();

        $todayEarnings = DB::table('finance.wallet_transactions')
            ->where('wallet_id', $wallet?->id)
            ->where('type', 'PAYOUT')->where('status', 'COMPLETED')
            ->where('created_at', '>=', $now->startOfDay()->utc())->where('created_at', '<', $now->addDay()->startOfDay()->utc())
            ->sum('amount');

        $weekEarnings = DB::table('finance.wallet_transactions')
            ->where('wallet_id', $wallet?->id)
            ->where('type', 'PAYOUT')->where('status', 'COMPLETED')
            ->where('created_at', '>=', $now->startOfWeek()->utc())->where('created_at', '<', $now->startOfWeek()->addWeek()->utc())
            ->sum('amount');

        $monthEarnings = DB::table('finance.wallet_transactions')
            ->where('wallet_id', $wallet?->id)
            ->where('type', 'PAYOUT')->where('status', 'COMPLETED')
            ->where('created_at', '>=', $now->startOfMonth()->utc())->where('created_at', '<', $now->startOfMonth()->addMonth()->utc())
            ->sum('amount');

        $completedServices = DB::table('booking.appointments')
            ->where('professional_id', $professional->id)
            ->where('status', 'COMPLETED')
            ->whereNull('deleted_at')->whereBetween('date', [$now->startOfMonth()->toDateString(), $now->endOfMonth()->toDateString()])
            ->count();

        $rating = DB::table('reviews.reviews')
            ->where('professional_id', $professional->id)->where('is_active', true)
            ->avg('rating') ?? 0;

        return ServiceResponse::success(array_merge([
            'balance' => $wallet?->balance ?? 0,
            'available_balance' => Money::decimal(max(0, Money::minor($wallet?->balance ?? 0) - Money::minor($wallet?->hold_balance ?? 0))),
            'hold_balance' => $wallet?->hold_balance ?? 0,
            'currency' => $wallet?->currency ?? 'COP',
            'today_earnings' => (float) $todayEarnings,
            'week_earnings' => (float) $weekEarnings,
            'month_earnings' => (float) $monthEarnings,
            'completed_services' => $completedServices,
            'rating' => round((float) $rating, 1),
        ], app(EarningsAnalyticsService::class)->overview($professional->id, $wallet?->id, $period),
            app(\App\Modules\Finance\Services\WithdrawalService::class)->summary($user->id)), 'Dashboard de ganancias')->toJsonResponse();
    }

    public function requestWithdrawal(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:10000|max:999999999999.99|decimal:0,2',
            'bank_account' => 'required|string|max:255',
            'bank_name' => 'required|string|max:100',
            'idempotency_key' => 'required|uuid',
        ]);

        $user = $request->user();
        if (! DB::table('people.professionals')->where('user_id', $user->id)->exists()) {
            return ServiceResponse::error('Esta operación requiere un perfil profesional.', null, 403)->toJsonResponse();
        }
        try {
            DB::transaction(fn () => $this->withdraw((int) $user->id, (string) $request->amount, $request->bank_name, $request->bank_account, $request->idempotency_key));
        } catch (\InvalidArgumentException $exception) {
            return ServiceResponse::error($exception->getMessage(), null, 422)->toJsonResponse();
        }

        return ServiceResponse::success(app(\App\Modules\Finance\Services\WithdrawalService::class)->summary($user->id), 'Retiro solicitado; la transferencia externa todavía no está confirmada.', 201)->toJsonResponse();
    }
    public function cancelWithdrawal(Request $request, int $id)
    {
        app(\App\Modules\Finance\Services\WithdrawalService::class)->cancel($request->user()->id, $id);
        return ServiceResponse::success(app(\App\Modules\Finance\Services\WithdrawalService::class)->summary($request->user()->id), 'Solicitud cancelada y saldo restituido.')->toJsonResponse();
    }
    private function withdraw(int $userId, string $amount, string $bankName, string $bankAccount, string $idempotencyKey): void
    {
        $wallet = \App\Modules\Finance\Models\Wallet::where('user_id', $userId)->lockForUpdate()->first();
        if (! $wallet) {
            throw new \InvalidArgumentException('Billetera no encontrada.');
        }
        $reference = 'WITHDRAWAL:' . $userId . ':' . $idempotencyKey;
        $previous = DB::table('finance.wallet_transactions')->where('wallet_id', $wallet->id)->where('external_reference', $reference)->first();
        if ($previous) {
            $withdrawal = DB::table('finance.withdrawals')->where('id', $previous->source_id)->where('user_id', $userId)->first();
            if (! $withdrawal || Money::minor((string) $withdrawal->amount) !== Money::minor($amount) || $withdrawal->bank_name !== $bankName || $withdrawal->bank_account !== $bankAccount) {
                throw new \InvalidArgumentException('La referencia ya corresponde a otra solicitud de retiro.');
            }
            return;
        }
        $withdrawalId = DB::table('finance.withdrawals')->insertGetId([
            'user_id' => $userId, 'amount' => $amount, 'bank_name' => $bankName, 'bank_account' => $bankAccount,
            'status' => 'PENDING', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $wallet->debit($amount, [
            'description' => 'Solicitud de retiro', 'source_type' => 'WITHDRAWAL', 'source_id' => $withdrawalId,
            'external_reference' => $reference,
        ]);
        app(\App\Modules\Finance\Services\WithdrawalService::class)->emit($withdrawalId);
    }

}
