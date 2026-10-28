<?php

namespace App\Modules\Platform\Services;

use App\Modules\Platform\Models\AIConversation;

final class AssistantPrivacyService
{
    public function redact(string $text): string
    {
        $text = preg_replace('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu', '[contacto omitido]', $text);
        return preg_replace('/(?<![\w-])(?:\+?\d{1,3}[ .-]?)?(?:\d{3}[ .-]?){2}\d{4}(?![\w-])/u', '[teléfono omitido]', $text);
    }

    public function history(array $history): array
    {
        return array_map(fn ($entry) => ['role' => ($entry['role'] ?? '') === 'assistant' ? 'assistant' : 'user',
            'content' => $this->redact(mb_substr((string) ($entry['content'] ?? ''), 0, 2000))], array_slice($history, -6));
    }

    public function prune(): int
    {
        return AIConversation::where('last_activity_at', '<', now()->subDays(90))->delete();
    }
}
