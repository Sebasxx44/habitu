<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        $methods = [
            ['name' => 'Efectivo', 'code' => 'cash', 'icon' => 'Banknote'],
            ['name' => 'Tarjeta de Crédito/Débito', 'code' => 'card', 'icon' => 'CreditCard'],
            ['name' => 'PSE', 'code' => 'pse', 'icon' => 'Landmark'],
            ['name' => 'MercadoPago', 'code' => 'mercadopago', 'icon' => 'Wallet'],
            ['name' => 'Transferencia Bancaria', 'code' => 'transfer', 'icon' => 'ArrowLeftRight'],
        ];

        foreach ($methods as $method) {
            DB::table('finance.payment_methods')->insert([
                ...$method,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
