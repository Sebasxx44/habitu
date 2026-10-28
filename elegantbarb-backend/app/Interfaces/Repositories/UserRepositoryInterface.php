<?php

namespace App\Interfaces\Repositories;

interface UserRepositoryInterface extends BaseRepositoryInterface
{
    public function findByEmail($email);
    public function getFilteredUsers($filters);
    public function createClientProfileForUser($user, $clientData);
}
