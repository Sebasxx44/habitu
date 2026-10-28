<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$db = $app->make('db');

$sql = "CREATE TABLE IF NOT EXISTS marketing.ads (
    id bigserial primary key,
    business_id bigint references public.businesses(id) on delete cascade,
    title varchar(255) not null,
    description text,
    image_url text,
    link_url text,
    placement varchar(50) default 'HOME',
    status varchar(50) default 'ACTIVE',
    priority int default 0,
    start_date timestamp,
    end_date timestamp,
    created_at timestamp,
    updated_at timestamp
)";

$db->unprepared($sql);
echo "marketing.ads created\n";
