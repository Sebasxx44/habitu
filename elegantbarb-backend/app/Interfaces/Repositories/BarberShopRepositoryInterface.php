<?php

namespace App\Interfaces\Repositories;

interface BarberShopRepositoryInterface extends BaseRepositoryInterface
{
    public function getFilteredShops($filters);
    public function getCountriesAndCities();
}
