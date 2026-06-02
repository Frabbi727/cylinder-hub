<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    public function index(): JsonResponse
    {
        $notifications = AppNotification::where('user_id', auth()->id())
            ->unread()
            ->orderByDesc('created_at')
            ->paginate(20);

        return $this->paginated($notifications);
    }

    public function markRead(int $id): JsonResponse
    {
        $notification = AppNotification::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $notification->update(['is_read' => true]);

        return $this->success($notification, 'Notification marked as read.');
    }

    public function markAllRead(): JsonResponse
    {
        AppNotification::where('user_id', auth()->id())
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return $this->deleted('All notifications marked as read.');
    }
}
