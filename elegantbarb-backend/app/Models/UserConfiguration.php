<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserConfiguration extends Model
{
    protected $fillable = ['user_id', 'key', 'value', 'config_type'];

    protected $casts = [
        'value' => 'string',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function setValue(int $userId, string $key, mixed $value, string $configType = 'string'): self
    {
        return self::updateOrCreate(
            ['user_id' => $userId, 'key' => $key],
            ['value' => is_array($value) ? json_encode($value) : (string) $value, 'config_type' => $configType]
        );
    }

    public static function getValue(int $userId, string $key, mixed $default = null): mixed
    {
        $config = self::where('user_id', $userId)->where('key', $key)->first();
        if (!$config) return $default;
        if ($config->config_type === 'json') return json_decode($config->value, true);
        if ($config->config_type === 'boolean') return filter_var($config->value, FILTER_VALIDATE_BOOLEAN);
        if ($config->config_type === 'integer') return (int) $config->value;
        return $config->value;
    }
}