<?php

return [
    // Booking date/time columns represent local business wall-clock time.
    'timezone' => env('BOOKING_TIMEZONE', 'America/Bogota'),
    'reminder_minutes' => explode(',', env('BOOKING_REMINDER_MINUTES', '1440,60')),
    // Explicitly enable after configuring SMTP and the queue worker. No historical outbox is replayed.
    'email_enabled' => env('BOOKING_EMAIL_ENABLED', false),
];
