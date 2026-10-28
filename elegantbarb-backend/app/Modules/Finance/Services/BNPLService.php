<?php

namespace App\Modules\Finance\Services;

use App\Core\DTOs\ServiceResponse;
use App\Modules\Finance\Models\BNPLApplication;
use App\Modules\Finance\Models\BNPLInstallment;
use Illuminate\Support\Facades\DB;

class BNPLService
{
    public function apply(array $data): ServiceResponse
    {
        $application = DB::transaction(function () use ($data) {
            $app = BNPLApplication::create([
                'client_id' => $data['client_id'],
                'appointment_id' => $data['appointment_id'],
                'total_amount' => $data['total_amount'],
                'installments_count' => $data['installments_count'] ?? 3,
                'interest_rate' => $data['interest_rate'] ?? 0,
                'status' => 'PENDING',
                'provider' => $data['provider'] ?? 'INTERNAL',
            ]);

            $this->generateInstallments($app);

            return $app;
        });

        return ServiceResponse::success($application->load('installments'), 'Application created', 201);
    }

    public function approve(int $applicationId): ServiceResponse
    {
        $application = BNPLApplication::find($applicationId);

        if (! $application) {
            return ServiceResponse::notFound('Application');
        }

        if ($application->status !== 'PENDING') {
            return ServiceResponse::error('Application is not pending');
        }

        $application->update(['status' => 'ACTIVE', 'approved_at' => now()]);

        return ServiceResponse::success($application->load('installments'), 'Application approved');
    }

    public function reject(int $applicationId): ServiceResponse
    {
        $application = BNPLApplication::find($applicationId);

        if (! $application) {
            return ServiceResponse::notFound('Application');
        }

        $application->update(['status' => 'REJECTED']);

        return ServiceResponse::success($application, 'Application rejected');
    }

    public function payInstallment(int $installmentId): ServiceResponse
    {
        $installment = BNPLInstallment::find($installmentId);

        if (! $installment) {
            return ServiceResponse::notFound('Installment');
        }

        if ($installment->status === 'PAID') {
            return ServiceResponse::error('Installment already paid');
        }

        $installment->update([
            'status' => 'PAID',
            'paid_date' => now(),
        ]);

        // Check if all paid
        $application = $installment->application;
        $allPaid = $application->installments()->where('status', '!=', 'PAID')->count() === 0;

        if ($allPaid) {
            $application->update(['status' => 'COMPLETED', 'completed_at' => now()]);
        }

        return ServiceResponse::success($installment, 'Installment paid');
    }

    public function getByClient(int $clientId): ServiceResponse
    {
        $applications = BNPLApplication::where('client_id', $clientId)
            ->with('installments')
            ->orderBy('created_at', 'desc')
            ->get();

        return ServiceResponse::success($applications, 'Applications retrieved');
    }

    public function getByAppointment(int $appointmentId): ServiceResponse
    {
        $application = BNPLApplication::where('appointment_id', $appointmentId)
            ->with('installments')
            ->first();

        if (! $application) {
            return ServiceResponse::notFound('Application');
        }

        return ServiceResponse::success($application, 'Application retrieved');
    }

    private function generateInstallments(BNPLApplication $application): void
    {
        $count = $application->installments_count;
        $amount = round($application->total_amount / $count, 2);
        $firstAmount = $amount + ($application->total_amount - ($amount * $count)); // Adjust rounding

        for ($i = 1; $i <= $count; $i++) {
            BNPLInstallment::create([
                'bnpl_application_id' => $application->id,
                'installment_number' => $i,
                'amount' => $i === 1 ? $firstAmount : $amount,
                'due_date' => now()->addDays(15 * $i),
                'status' => 'PENDING',
            ]);
        }
    }
}
