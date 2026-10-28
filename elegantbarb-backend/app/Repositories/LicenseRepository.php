<?php
namespace App\Repositories;
use App\Models\License;
class LicenseRepository extends BaseRepository
{
    public function __construct(License $model) { parent::__construct($model); }
}