<?php

namespace App\Modules\Finance\Services;

use App\Core\DTOs\ServiceResponse;
use App\Modules\Finance\Models\SplitPayment;
use App\Modules\Finance\Models\SplitPaymentParticipant;
use Illuminate\Support\Facades\DB;

class SplitPaymentService
{
    public function create(int $appointmentId, float $totalAmount, array $participants): ServiceResponse
    {
        $count = count($participants);

        if ($count < 2) {
            return ServiceResponse::error('At least 2 participants required');
        }

        $split = DB::transaction(function () use ($appointmentId, $totalAmount, $participants, $count) {
            $payment = SplitPayment::create([
                'appointment_id' => $appointmentId,
                'total_amount' => $totalAmount,
                'split_count' => $count,
                'status' => 'PENDING',
            ]);

            $baseAmount = round($totalAmount / $count, 2);
            $firstAmount = $baseAmount + ($totalAmount - ($baseAmount * $count));

            foreach ($participants as $index => $userId) {
                SplitPaymentParticipant::create([
                    'split_payment_id' => $payment->id,
                    'user_id' => $userId,
                    'amount' => $index === 0 ? $firstAmount : $baseAmount,
                    'status' => 'PENDING',
                ]);
            }

            return $payment;
        });

        return ServiceResponse::success($split->load('participants'), 'Split payment created', 201);
    }

    /**
     * Create an automated merchant commission split for a payment.
     * Platform takes a configurable commission (default 10%), professional/business gets the rest.
     */
    public function createMerchantSplit(int $appointmentId, float $totalAmount, int $businessUserId, float $commissionRate = 0.10): ServiceResponse
    {
        $platformFee = round($totalAmount * $commissionRate, 2);
        $businessPayout = round($totalAmount - $platformFee, 2);

        $split = DB::transaction(function () use ($appointmentId, $totalAmount, $platformFee, $businessPayout, $businessUserId) {
            $payment = SplitPayment::create([
                'appointment_id' => $appointmentId,
                'total_amount' => $totalAmount,
                'split_count' => 2,
                'status' => 'PENDING',
            ]);

            // Platform commission (user_id = 0 as standard platform system user)
            SplitPaymentParticipant::create([
                'split_payment_id' => $payment->id,
                'user_id' => 0,
                'amount' => $platformFee,
                'status' => 'PENDING',
            ]);

            // Business/Professional payout
            SplitPaymentParticipant::create([
                'split_payment_id' => $payment->id,
                'user_id' => $businessUserId,
                'amount' => $businessPayout,
                'status' => 'PENDING',
            ]);

            return $payment;
        });

        return ServiceResponse::success($split->load('participants'), 'Split de comisión creado', 201);
    }

    /**
     * Auto-settle a merchant split when payment is confirmed.
     */
    public function settlemerchantSplit(int $appointmentId): ServiceResponse
    {
        $payment = SplitPayment::where('appointment_id', $appointmentId)
            ->where('status', 'PENDING')
            ->first();

        if (!$payment) {
            return ServiceResponse::notFound('Split payment');
        }

        $payment->participants()->update([
            'status' => 'PAID',
            'paid_at' => now(),
        ]);
        $payment->update(['status' => 'PAID']);

        return ServiceResponse::success($payment->load('participants'), 'Split liquidado exitosamente');
    }

    public function markPaid(int $participantId, int $userId): ServiceResponse
    {
        $participant = SplitPaymentParticipant::where('id', $participantId)
            ->where('user_id', $userId)
            ->first();

        if (! $participant) {
            return ServiceResponse::notFound('Participant');
        }

        if ($participant->status === 'PAID') {
            return ServiceResponse::error('Already paid');
        }

        $participant->update(['status' => 'PAID', 'paid_at' => now()]);

        // Check completion
        $payment = $participant->splitPayment;
        $allPaid = $payment->participants()->where('status', '!=', 'PAID')->count() === 0;

        if ($allPaid) {
            $payment->update(['status' => 'PAID']);
        }

        return ServiceResponse::success($participant, 'Payment marked as paid');
    }

    public function getByAppointment(int $appointmentId): ServiceResponse
    {
        $payment = SplitPayment::where('appointment_id', $appointmentId)
            ->with('participants.user:id,name,email')
            ->first();

        if (! $payment) {
            return ServiceResponse::notFound('Split payment');
        }

        return ServiceResponse::success($payment, 'Split payment retrieved');
    }

    public function getByUser(int $userId): ServiceResponse
    {
        $participantIds = SplitPaymentParticipant::where('user_id', $userId)->pluck('split_payment_id');
        $payments = SplitPayment::whereIn('id', $participantIds)
            ->with('participants.user:id,name,email')
            ->orderBy('created_at', 'desc')
            ->get();

        return ServiceResponse::success($payments, 'Payments retrieved');
    }
}
