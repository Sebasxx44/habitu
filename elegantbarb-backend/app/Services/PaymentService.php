<?php

namespace App\Services;

use App\Interfaces\Services\PaymentServiceInterface;
use App\Modules\Booking\Models\Appointment;

class PaymentService implements PaymentServiceInterface
{
    public function createPreference($appointmentId)
    {
        $appointment = Appointment::with(['service', 'client'])->findOrFail($appointmentId);
        
        // MercadoPago SDK simulation - in production use mercadopago/sdk
        $preference = [
            'id' => 'pref_' . uniqid(),
            'init_point' => 'https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=' . uniqid(),
            'sandbox_init_point' => 'https://sandbox.mercadopago.com.co/checkout/v1/redirect?pref_id=' . uniqid(),
            'items' => [
                [
                    'title' => $appointment->service->name,
                    'quantity' => 1,
                    'unit_price' => (float) $appointment->price,
                    'currency_id' => 'COP',
                ]
            ],
            'external_reference' => (string) $appointment->id,
        ];

        return [
            'preference_id' => $preference['id'],
            'init_point' => $preference['init_point'],
            'sandbox_init_point' => $preference['sandbox_init_point'],
            'public_key' => config('services.mercadopago.public_key'),
        ];
    }

    public function handleWebhook(array $data)
    {
        if (isset($data['data']['id'])) {
            $paymentId = $data['data']['id'];
            // In production: verify payment with MercadoPago API
            // Update appointment status
        }

        return ['status' => 'ok'];
    }

    public function markPaid($appointmentId)
    {
        $appointment = Appointment::findOrFail($appointmentId);
        $appointment->update(['paid' => true, 'status' => 'COMPLETADA']);

        return $appointment;
    }
}
