<?php

return [
    'enabled' => (bool) env('PUSH_ENABLED', false),
    'project_id' => env('FCM_PROJECT_ID'),
    'client_email' => env('FCM_CLIENT_EMAIL'),
    'private_key' => env('FCM_PRIVATE_KEY'),
    'web' => [
        'apiKey' => env('FIREBASE_WEB_API_KEY'),
        'authDomain' => env('FIREBASE_AUTH_DOMAIN'),
        'projectId' => env('FCM_PROJECT_ID'),
        'messagingSenderId' => env('FCM_SENDER_ID'),
        'appId' => env('FIREBASE_APP_ID'),
    ],
    'vapid_key' => env('FIREBASE_VAPID_KEY'),
];
