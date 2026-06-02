<?php

namespace App\Console\Commands;

use App\Models\StockAllocation;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendUnreconciledNotifications extends Command
{
    protected $signature   = 'notify:unreconciled';
    protected $description = 'Notify admins of salesmen who have not submitted end-of-day reconciliation';

    public function handle(NotificationService $notifications): void
    {
        $unreconciled = StockAllocation::whereDate('allocation_date', today())
            ->where('is_reconciled', false)
            ->with('salesman')
            ->get()
            ->groupBy('salesman_id');

        foreach ($unreconciled as $salesmanId => $allocations) {
            $salesman = $allocations->first()->salesman;
            if (! $salesman) continue;

            $notifications->notifyAdmins(
                'unreconciled',
                'End of Day Not Submitted',
                "{$salesman->name} has not submitted End of Day yet.",
                $salesmanId
            );
        }

        $this->info("Unreconciled notifications sent for {$unreconciled->count()} salesman(s).");
    }
}
