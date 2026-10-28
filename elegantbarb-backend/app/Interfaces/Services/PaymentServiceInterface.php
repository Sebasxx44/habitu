<?php

namespace App\Interfaces\Services;

interface PaymentServiceInterface
{
    public function createPreference($appointmentId);
    public function handleWebhook(array $data);
    public function markPaid($appointmentId);
}
