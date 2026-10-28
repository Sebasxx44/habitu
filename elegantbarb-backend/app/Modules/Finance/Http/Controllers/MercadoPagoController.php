<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Core\DTOs\ServiceResponse;
use App\Services\MercadoPagoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MercadoPagoController extends Controller
{
    public function __construct(protected MercadoPagoService $mp) {}

    public function createWalletPreference(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:5000|max:9999999999.99|decimal:0,2',
            'description' => 'required|string|max:255',
        ]);

        $user = $request->user();
        $externalRef = 'WALLET-TOPUP-' . $user->id . '-' . \Illuminate\Support\Str::uuid();

        $items = [[
            'title' => $request->description,
            'quantity' => 1,
            'unit_price' => (float) $request->amount,
            'currency_id' => 'COP',
        ]];

        $payer = [
            'name' => $user->name,
            'email' => $user->email,
        ];

        $response = $this->mp->createPreference($items, $payer, $externalRef);

        if ($response->success && isset($response->data['id'])) {
            DB::table('finance.wallet_topups')->insert([
                'user_id' => $user->id,
                'amount' => $request->amount,
                'external_reference' => $externalRef,
                'preference_id' => $response->data['id'],
                'status' => 'PENDING',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $response->toJsonResponse();
    }

    public function createAppointmentPreference(Request $request)
    {
        $request->validate([
            'appointment_id' => ['required', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Booking\Models\Appointment::class, 'id')],
        ]);

        $appointment = DB::table('booking.appointments')
            ->where('id', $request->appointment_id)
            ->first();

        if (! $appointment) {
            return ServiceResponse::error('Cita no encontrada', null, 404)->toJsonResponse();
        }

        $user = $request->user();
        $clientUserId = DB::table('people.clients')->where('id', $appointment->client_id)->value('user_id');
        $ownerUserId = DB::table('business.businesses')->where('id', $appointment->business_id)->value('owner_user_id');
        if ($user->role !== 'SUPERADMIN' && ! in_array((int) $user->id, [(int) $clientUserId, (int) $ownerUserId], true)) {
            return ServiceResponse::forbidden()->toJsonResponse();
        }
        if (! in_array($appointment->status, ['PENDING', 'CONFIRMED', 'RESCHEDULED'], true) || $appointment->payment_status === 'PAID') {
            return ServiceResponse::error('Esta cita no admite un nuevo pago.', null, 422)->toJsonResponse();
        }
        $externalRef = 'APPOINTMENT-' . $appointment->id . '-' . \Illuminate\Support\Str::uuid();

        $serviceName = DB::table('catalog.services')
            ->where('id', $appointment->service_id)
            ->value('name') ?? 'Servicio';

        $items = [[
            'title' => $serviceName,
            'quantity' => 1,
            'unit_price' => (float) ($appointment->final_price ?? $appointment->price ?? 0),
            'currency_id' => 'COP',
        ]];

        $payer = [
            'name' => $user->name,
            'email' => $user->email,
        ];

        $response = $this->mp->createPreference($items, $payer, $externalRef);

        if ($response->success && isset($response->data['id'])) {
            DB::table('finance.payments')->insert([
                'appointment_id' => $appointment->id,
                'client_id' => $appointment->client_id,
                'business_id' => $appointment->business_id,
                'amount' => $appointment->final_price ?? $appointment->price ?? 0,
                'external_reference' => $externalRef,
                'preference_id' => $response->data['id'],
                'status' => 'PENDING',
                'method' => 'MERCADOPAGO',
                'created_at' => now(),
                'updated_at' => now(),
            ]);


        }

        return $response->toJsonResponse();
    }

    public function webhook(Request $request)
    {
        $response = $this->mp->processWebhook($request->all());

        if (! $response->success) {
            return $response->toJsonResponse();
        }

        return app(\App\Modules\Finance\Services\PaymentReconciliationService::class)
            ->reconcile(is_array($response->data) ? $response->data : [])->toJsonResponse();
    }


    public function publicKey()
    {
        return ServiceResponse::success([
            'public_key' => $this->mp->getPublicKey(),
        ], 'Clave pública de MercadoPago')->toJsonResponse();
    }
}
