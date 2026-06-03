<?php

namespace App\Services;

use App\Models\AuditLog;

class AuditLogService
{
    public function log(
        string $action,
        string $model,
        int $modelId,
        ?int $userId,
        ?string $description = null,
        ?array $oldValue = null,
        ?array $newValue = null,
        ?string $ipAddress = null
    ): void {
        AuditLog::create([
            'user_id'     => $userId,
            'action'      => $action,
            'model'       => $model,
            'model_id'    => $modelId,
            'old_value'   => $oldValue,
            'new_value'   => $newValue,
            'ip_address'  => $ipAddress ?? request()->ip(),
            'description' => $description,
        ]);
    }
}
