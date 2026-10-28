<?php

namespace App\Interfaces\Repositories;

interface ServiceRepositoryInterface extends BaseRepositoryInterface
{
    public function getServiceStats($service);
}
