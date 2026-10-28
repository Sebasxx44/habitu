<?php

return [
    'redis_connection' => 'reports',
    'stream' => env('REPORT_STREAM', 'habitu:reports'),
    'directory' => env('REPORT_DIRECTORY', storage_path('app/private/reports')),
    'max_active_per_user' => 3,
    'max_interactive_rows' => 10000,
    'expires_hours' => 24,
];
