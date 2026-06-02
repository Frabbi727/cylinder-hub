<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendOverdueNotifications extends Command
{
    protected $signature   = 'notify:overdue {--days=7 : Minimum overdue days}';
    protected $description = 'Notify admins of customers with overdue payments';

    public function handle(NotificationService $notifications): void
    {
        $days = (int) $this->option('days');

        $overdueCustomers = DB::table('sales as s')
            ->join('customers as c', 'c.id', '=', 's.customer_id')
            ->selectRaw('c.id, c.name, c.total_due, DATEDIFF(CURDATE(), MIN(s.sale_date)) as days_overdue')
            ->whereNull('s.deleted_at')
            ->whereRaw('(s.total_amount - s.paid_amount) > 0')
            ->whereNotNull('s.customer_id')
            ->groupBy('c.id', 'c.name', 'c.total_due')
            ->havingRaw('DATEDIFF(CURDATE(), MIN(s.sale_date)) >= ?', [$days])
            ->get();

        foreach ($overdueCustomers as $customer) {
            $notifications->notifyAdmins(
                'overdue_customer',
                'Overdue Customer',
                "{$customer->name} has ৳" . number_format($customer->total_due, 2) . " overdue for {$customer->days_overdue} days.",
                $customer->id
            );
        }

        $this->info("Overdue notifications sent for {$overdueCustomers->count()} customer(s).");
    }
}
