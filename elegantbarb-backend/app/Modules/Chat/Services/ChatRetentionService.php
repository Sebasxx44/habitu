<?php

namespace App\Modules\Chat\Services;

use App\Modules\Chat\Models\Message;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ChatRetentionService
{
    public function prune(): int
    {
        $cutoff = now()->subDays(90);
        DB::table('chat.attachments')->where('created_at', '<', $cutoff)->orderBy('id')->chunkById(100, function ($attachments) {
            foreach ($attachments as $attachment) {
                Storage::disk('local')->delete($attachment->path);
                if (Storage::disk('local')->exists($attachment->path)) continue;
                DB::table('chat.attachments')->where('id', $attachment->id)->delete();
            }
        });
        return Message::withTrashed()->where('created_at', '<', $cutoff)->forceDelete();
    }
}
