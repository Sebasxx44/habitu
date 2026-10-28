<?php

namespace App\Services;

use App\Interfaces\IBaseService;
use App\Repositories\BaseRepository;
use Illuminate\Database\Eloquent\Model;

abstract class BaseService implements IBaseService
{
    protected BaseRepository $repository;
    protected Model $model;

    public function __construct(BaseRepository $repository)
    {
        $this->repository = $repository;
    }

    public function all(array $filters = [], ?callable $buildExtra = null)
    {
        return $this->repository->all($filters, $buildExtra);
    }

    public function find($id, array $filters = [], bool $failOnMissing = false)
    {
        return $this->repository->find($id, $filters, $failOnMissing);
    }

    public function create(array $data)
    {
        return $this->repository->create($data);
    }

    public function update($id, array $data)
    {
        return $this->repository->update($id, $data);
    }

    public function delete($id)
    {
        return $this->repository->delete($id);
    }

    public function findBy(array $conditions = [], array $whereInConditions = [], array $params = [])
    {
        return $this->repository->findBy($conditions, $whereInConditions, $params);
    }
}