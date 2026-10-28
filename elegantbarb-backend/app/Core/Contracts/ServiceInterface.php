<?php

namespace App\Core\Contracts;

use App\Core\DTOs\ServiceResponse;

interface ServiceInterface
{
    public function all(array $filters = []): ServiceResponse;
    public function find(int $id): ServiceResponse;
    public function create(array $data): ServiceResponse;
    public function update(int $id, array $data): ServiceResponse;
    public function delete(int $id): ServiceResponse;
}
