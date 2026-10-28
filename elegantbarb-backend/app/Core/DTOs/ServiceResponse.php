<?php

namespace App\Core\DTOs;

class ServiceResponse
{
    public function __construct(
        public bool $success,
        public mixed $data = null,
        public ?string $message = null,
        public ?string $error = null,
        public int $statusCode = 200,
        public array $meta = []
    ) {}

    public static function success(mixed $data = null, string $message = 'OK', int $code = 200): self
    {
        return new self(true, $data, $message, null, $code);
    }

    public static function error(string $error, ?string $message = null, int $code = 400): self
    {
        return new self(false, null, $message, $error, $code);
    }

    public static function notFound(string $resource = 'Resource'): self
    {
        return new self(false, null, null, "$resource not found", 404);
    }

    public static function forbidden(string $reason = 'Insufficient permissions'): self
    {
        return new self(false, null, null, $reason, 403);
    }

    public static function unauthorized(string $reason = 'Unauthenticated'): self
    {
        return new self(false, null, null, $reason, 401);
    }

    public static function validationError(array $errors): self
    {
        return new self(false, ['errors' => $errors], null, 'Validation failed', 422);
    }

    public function toArray(): array
    {
        $response = [
            'success' => $this->success,
            'message' => $this->message,
        ];

        if ($this->data !== null) {
            $response['data'] = $this->data;
        }

        if ($this->error !== null) {
            $response['error'] = $this->error;
        }

        if (!empty($this->meta)) {
            $response['meta'] = $this->meta;
        }

        return $response;
    }

    public function toJsonResponse(): \Illuminate\Http\JsonResponse
    {
        return response()->json($this->toArray(), $this->statusCode);
    }
}
