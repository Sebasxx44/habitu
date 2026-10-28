<?php

namespace App\Interfaces;

interface IBaseService
{
    public function all(array $filters = [], ?callable $buildExtra = null);
    public function find($id, array $filters = [], bool $failOnMissing = false);
    public function create(array $data);
    public function update($id, array $data);
    public function delete($id);
    public function findBy(array $conditions = [], array $whereInConditions = [], array $params = []);
}