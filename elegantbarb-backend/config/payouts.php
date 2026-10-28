<?php

return [
    // Sandbox is intentionally the only reachable environment in this adapter.
    'sandbox_enabled' => (bool) env('WOMPI_PAYOUTS_SANDBOX_ENABLED', false),
    'api_key' => env('WOMPI_PAYOUTS_SANDBOX_API_KEY', ''),
    'principal_id' => env('WOMPI_PAYOUTS_SANDBOX_PRINCIPAL_ID', ''),
    'source_account_id' => env('WOMPI_PAYOUTS_SANDBOX_SOURCE_ACCOUNT_ID', ''),
    'test_bank_id' => env('WOMPI_PAYOUTS_SANDBOX_BANK_ID', ''),
    // Synthetic recipient only. No customer bank details or identity enter sandbox.
    'test_account_number' => '12345678',
];
