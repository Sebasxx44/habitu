<?php

return [
    // Use '*' only behind the hosting provider's isolated ingress.
    'proxies' => env('TRUSTED_PROXIES', '127.0.0.1,::1'),
];

