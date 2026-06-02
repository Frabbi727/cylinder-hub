<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\CylinderStock;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\User;

class NotificationService
{
    public function notify(int $userId, string $type, string $title, string $body, ?int $referenceId = null): void
    {
        AppNotification::create([
            'user_id'      => $userId,
            'type'         => $type,
            'title'        => $title,
            'body'         => $body,
            'reference_id' => $referenceId,
        ]);
    }

    public function notifyAdmins(string $type, string $title, string $body, ?int $referenceId = null): void
    {
        User::where('role', 'admin')->pluck('id')->each(
            fn ($id) => $this->notify($id, $type, $title, $body, $referenceId)
        );
    }

    public function checkLowStock(int $cylinderId): void
    {
        $stock = CylinderStock::with('cylinder')->where('cylinder_id', $cylinderId)->first();
        if (! $stock?->cylinder) {
            return;
        }

        $reorderLevel = $stock->cylinder->reorder_level ?? 10;
        if ($stock->filled_qty > $reorderLevel) {
            return;
        }

        $alreadyNotified = AppNotification::where('type', 'low_stock')
            ->where('reference_id', $cylinderId)
            ->whereDate('created_at', today())
            ->exists();

        if (! $alreadyNotified) {
            $this->notifyAdmins(
                'low_stock',
                'Low Stock Alert',
                "{$stock->cylinder->name} is low — only {$stock->filled_qty} filled units remaining.",
                $cylinderId
            );
        }
    }

    public function checkLargeSale(Sale $sale): void
    {
        $threshold = config('business.large_sale_threshold', 10000);
        if ($sale->total_amount < $threshold) {
            return;
        }

        $salesmanName = $sale->salesman?->name ?? 'Unknown';
        $this->notifyAdmins(
            'large_sale',
            'Large Sale Recorded',
            'Large sale of ৳' . number_format($sale->total_amount, 2) . " recorded by {$salesmanName}.",
            $sale->id
        );
    }

    public function supplierDueAlert(Supplier $supplier): void
    {
        if ($supplier->total_due <= 0) {
            return;
        }

        $this->notifyAdmins(
            'supplier_due',
            'Supplier Payment Outstanding',
            "{$supplier->name} payment of ৳" . number_format($supplier->total_due, 2) . ' is outstanding.',
            $supplier->id
        );
    }
}
