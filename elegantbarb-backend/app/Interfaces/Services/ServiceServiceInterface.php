<?php

namespace App\Interfaces\Services;

interface ServiceServiceInterface
{
    public function getAllServices();
    public function getService($service);
    public function createService(array $data);
    public function updateService($service, array $data);
    public function deleteService($service);
    public function getServiceStats($service);
}
