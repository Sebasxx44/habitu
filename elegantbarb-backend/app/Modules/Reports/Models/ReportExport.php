<?php

namespace App\Modules\Reports\Models;

use Illuminate\Database\Eloquent\Model;

class ReportExport extends Model
{
    protected $table = 'public.report_exports';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected $attributes = ['status' => 'queued', 'attempts' => 0, 'rows_processed' => 0, 'error' => null];
    protected $casts = [
        'business_ids' => 'array', 'filters' => 'array', 'expires_at' => 'datetime',
        'rows_processed' => 'integer', 'attempts' => 'integer',
    ];
    protected $hidden = ['fingerprint', 'business_ids', 'user_id'];
}
