<?php

namespace App\Interfaces\Services;

interface AuthServiceInterface
{
    public function login(array $credentials);
    public function loginWithGoogle(array $data);
    public function register(array $data);
    public function getMe($user);
    public function refreshToken($user);
    public function getUsersList($filters);
    public function createUser(array $data);
    public function updateUser($user, array $data);
    public function deleteUser($user);
}
