<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Cylinder;
use App\Models\CylinderReturn;
use App\Models\CylinderStock;
use App\Models\DueCollection;
use App\Models\DuePayment;
use App\Models\Expense;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\StockAllocation;
use App\Models\Supplier;
use App\Models\User;
use App\Services\AllocationService;
use App\Services\SaleService;
use App\Services\StockService;
use Illuminate\Database\Seeder;

class SampleDataSeeder extends Seeder
{
    public function run(): void
    {
        $sale       = app(SaleService::class);
        $stock      = app(StockService::class);
        $allocation = app(AllocationService::class);

        // Date helper — relative to today so demo data is always current
        $d = fn (int $daysAgo) => now()->subDays($daysAgo)->toDateString();

        // ── Users ─────────────────────────────────────────────────────────────
        $admin = User::where('role', 'admin')->first();

        // Authenticate as admin so auth()->id() works in services (stock movements etc.)
        auth()->loginUsingId($admin->id);

        $karim = User::where('email', 'karim@cylinderhub.com')->first();
        $rafiq = User::where('email', 'rafiq@cylinderhub.com')->first();
        $jamal = User::where('email', 'jamal@cylinderhub.com')->first();

        // ── Cylinders ────────────────────────────────────────────────────────
        $o12 = Cylinder::where('name', 'Omera')->where('size', '12kg')->first();
        $o35 = Cylinder::where('name', 'Omera')->where('size', '35kg')->first();
        $j35 = Cylinder::where('name', 'Jamuna')->where('size', '35kg')->first();
        $b12 = Cylinder::where('name', 'Basundhara')->where('size', '12kg')->first();
        $b35 = Cylinder::where('name', 'Basundhara')->where('size', '35kg')->first();
        $p45 = Cylinder::where('name', 'Padma')->where('size', '45kg')->first();

        // ── Suppliers ────────────────────────────────────────────────────────
        $omera  = Supplier::where('name', 'Omera Gas One Ltd')->first();
        $bashun = Supplier::where('name', 'Bashundhara LP Gas')->first();
        $jamuna = Supplier::where('name', 'Jamuna Gas Ltd')->first();
        $padma  = Supplier::where('name', 'Padma Gas Co.')->first();

        // ── Reset stock to zero — purchases will rebuild it ───────────────────
        CylinderStock::query()->update(['filled_qty' => 0, 'empty_qty' => 0]);
        Customer::query()->update(['total_due' => 0]);
        Supplier::query()->update(['total_due' => 0]);

        // ── Customers ────────────────────────────────────────────────────────
        $c = Customer::all()->keyBy('name');

        // ── 1. PURCHASES (last 20 days) ───────────────────────────────────────
        // Prices: Omera 12kg ৳1,100 | Omera 35kg ৳3,100 | Jamuna 35kg ৳3,050
        //         Basundhara 12kg ৳1,050 | Basundhara 35kg ৳3,000 | Padma 45kg ৳4,500

        // Lot 1 — Omera 12kg × 80 @ ৳1,100 (20 days ago, fully paid)
        $this->makePurchase($omera->id, $admin->id, $d(20), 88000, 88000,
            [[$o12->id, 80, 1100.00]], $stock);

        // Lot 2 — Basundhara 12kg × 60 @ ৳1,050 (18 days ago, fully paid)
        $this->makePurchase($bashun->id, $admin->id, $d(18), 63000, 63000,
            [[$b12->id, 60, 1050.00]], $stock);

        // Lot 3 — Omera 35kg × 30 + Jamuna 35kg × 40 @ (15 days ago, partially paid)
        $this->makePurchase($omera->id, $admin->id, $d(15), 215000, 150000,
            [[$o35->id, 30, 3100.00], [$j35->id, 40, 3050.00]], $stock);
        $omera->increment('total_due', 65000);

        // Lot 4 — Omera 12kg × 60 @ ৳1,110 (12 days ago, fully paid)
        $this->makePurchase($omera->id, $admin->id, $d(12), 66600, 66600,
            [[$o12->id, 60, 1110.00]], $stock);

        // Lot 5 — Basundhara 35kg × 25 @ ৳3,000 (10 days ago, partially paid)
        $this->makePurchase($bashun->id, $admin->id, $d(10), 75000, 50000,
            [[$b35->id, 25, 3000.00]], $stock);
        $bashun->increment('total_due', 25000);

        // Lot 6 — Padma 45kg × 15 @ ৳4,500 (7 days ago, fully paid)
        $this->makePurchase($padma->id, $admin->id, $d(7), 67500, 67500,
            [[$p45->id, 15, 4500.00]], $stock);

        // Lot 7 — Basundhara 12kg × 40 @ ৳1,060 (4 days ago, fully paid)
        $this->makePurchase($bashun->id, $admin->id, $d(4), 42400, 42400,
            [[$b12->id, 40, 1060.00]], $stock);

        // ── 2. COUNTER SALES (last 18 days) ──────────────────────────────────
        // Sale prices: Omera 12kg ৳1,350 | Basundhara 12kg ৳1,300 | Omera 35kg ৳3,800
        //              Jamuna 35kg ৳3,750 | Basundhara 35kg ৳3,700 | Padma 45kg ৳5,500

        // --- Omera 12kg sales (admin counter) ---
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Hotel Sonar Bangla']->id,  'sale_date'=>$d(18),'payment_type'=>'cash',   'paid_amount'=>5400,  'items'=>[['cylinder_id'=>$o12->id,'qty'=>4,'unit_price'=>1350]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Nodi General Store']->id,  'sale_date'=>$d(17),'payment_type'=>'cash',   'paid_amount'=>4050,  'items'=>[['cylinder_id'=>$o12->id,'qty'=>3,'unit_price'=>1350]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Padma Restaurant']->id,    'sale_date'=>$d(16),'payment_type'=>'due',    'paid_amount'=>0,     'items'=>[['cylinder_id'=>$o12->id,'qty'=>6,'unit_price'=>1350]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Green Valley Hotel']->id,  'sale_date'=>$d(15),'payment_type'=>'cash',   'paid_amount'=>10800, 'items'=>[['cylinder_id'=>$o12->id,'qty'=>8,'unit_price'=>1350]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['City Garments Ltd']->id,   'sale_date'=>$d(14),'payment_type'=>'partial', 'paid_amount'=>5000, 'items'=>[['cylinder_id'=>$o12->id,'qty'=>5,'unit_price'=>1350]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>null,                          'sale_date'=>$d(13),'payment_type'=>'cash',   'paid_amount'=>5400,  'items'=>[['cylinder_id'=>$o12->id,'qty'=>4,'unit_price'=>1350]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Dhaka Sweet House']->id,   'sale_date'=>$d(12),'payment_type'=>'cash',   'paid_amount'=>6750,  'items'=>[['cylinder_id'=>$o12->id,'qty'=>5,'unit_price'=>1350]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Padma Restaurant']->id,    'sale_date'=>$d(11),'payment_type'=>'due',    'paid_amount'=>0,     'items'=>[['cylinder_id'=>$o12->id,'qty'=>5,'unit_price'=>1350]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c["Mitu's Kitchen"]->id,      'sale_date'=>$d(10),'payment_type'=>'cash',   'paid_amount'=>5400,  'items'=>[['cylinder_id'=>$o12->id,'qty'=>4,'unit_price'=>1350]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Raju Tea Stall']->id,      'sale_date'=>$d(9), 'payment_type'=>'cash',   'paid_amount'=>2700,  'items'=>[['cylinder_id'=>$o12->id,'qty'=>2,'unit_price'=>1350]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Hotel Sonar Bangla']->id,  'sale_date'=>$d(8), 'payment_type'=>'cash',   'paid_amount'=>8100,  'items'=>[['cylinder_id'=>$o12->id,'qty'=>6,'unit_price'=>1350]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Salam Furniture']->id,     'sale_date'=>$d(7), 'payment_type'=>'partial', 'paid_amount'=>4000, 'items'=>[['cylinder_id'=>$o12->id,'qty'=>4,'unit_price'=>1350]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Nodi General Store']->id,  'sale_date'=>$d(6), 'payment_type'=>'cash',   'paid_amount'=>6750,  'items'=>[['cylinder_id'=>$o12->id,'qty'=>5,'unit_price'=>1350]]]);

        // --- Basundhara 12kg sales ---
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Green Valley Hotel']->id,  'sale_date'=>$d(17),'payment_type'=>'cash',   'paid_amount'=>5200,  'items'=>[['cylinder_id'=>$b12->id,'qty'=>4,'unit_price'=>1300]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Rahela Store']->id,         'sale_date'=>$d(14),'payment_type'=>'due',    'paid_amount'=>0,     'items'=>[['cylinder_id'=>$b12->id,'qty'=>6,'unit_price'=>1300]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['City Garments Ltd']->id,   'sale_date'=>$d(11),'payment_type'=>'cash',   'paid_amount'=>7800,  'items'=>[['cylinder_id'=>$b12->id,'qty'=>6,'unit_price'=>1300]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>null,                          'sale_date'=>$d(8), 'payment_type'=>'cash',   'paid_amount'=>5200,  'items'=>[['cylinder_id'=>$b12->id,'qty'=>4,'unit_price'=>1300]]]);

        // --- Omera 35kg sales ---
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Green Valley Hotel']->id,  'sale_date'=>$d(14),'payment_type'=>'cash',   'paid_amount'=>11400, 'items'=>[['cylinder_id'=>$o35->id,'qty'=>3,'unit_price'=>3800]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Hotel Sonar Bangla']->id,  'sale_date'=>$d(11),'payment_type'=>'cash',   'paid_amount'=>15200, 'items'=>[['cylinder_id'=>$o35->id,'qty'=>4,'unit_price'=>3800]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c["Mitu's Kitchen"]->id,      'sale_date'=>$d(8), 'payment_type'=>'due',    'paid_amount'=>0,     'items'=>[['cylinder_id'=>$o35->id,'qty'=>3,'unit_price'=>3800]]]);

        // --- Jamuna 35kg sales ---
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Dhaka Sweet House']->id,   'sale_date'=>$d(13),'payment_type'=>'cash',   'paid_amount'=>11250, 'items'=>[['cylinder_id'=>$j35->id,'qty'=>3,'unit_price'=>3750]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Padma Restaurant']->id,    'sale_date'=>$d(9), 'payment_type'=>'due',    'paid_amount'=>0,     'items'=>[['cylinder_id'=>$j35->id,'qty'=>4,'unit_price'=>3750]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Green Valley Hotel']->id,  'sale_date'=>$d(6), 'payment_type'=>'cash',   'paid_amount'=>15000, 'items'=>[['cylinder_id'=>$j35->id,'qty'=>4,'unit_price'=>3750]]]);

        // --- Padma 45kg sales ---
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['City Garments Ltd']->id,   'sale_date'=>$d(6), 'payment_type'=>'cash',   'paid_amount'=>27500, 'items'=>[['cylinder_id'=>$p45->id,'qty'=>5,'unit_price'=>5500]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'salesman_role'=>'admin','customer_id'=>$c['Hotel Sonar Bangla']->id,  'sale_date'=>$d(3), 'payment_type'=>'partial', 'paid_amount'=>10000,'items'=>[['cylinder_id'=>$p45->id,'qty'=>3,'unit_price'=>5500]]]);

        // ── 3. EMPTY CYLINDER RETURNS FROM CUSTOMERS ─────────────────────────
        CylinderReturn::create(['cylinder_id'=>$o12->id,'salesman_id'=>$admin->id,'recorded_by'=>$admin->id,'customer_id'=>$c['Hotel Sonar Bangla']->id, 'qty'=>10,'type'=>'empty_return','return_date'=>$d(14),'is_extra'=>false]);
        $stock->addEmptyStock($o12->id, 10);

        CylinderReturn::create(['cylinder_id'=>$o12->id,'salesman_id'=>$admin->id,'recorded_by'=>$admin->id,'customer_id'=>$c['Green Valley Hotel']->id, 'qty'=>8, 'type'=>'empty_return','return_date'=>$d(12),'is_extra'=>false]);
        $stock->addEmptyStock($o12->id, 8);

        CylinderReturn::create(['cylinder_id'=>$b12->id,'salesman_id'=>$admin->id,'recorded_by'=>$admin->id,'customer_id'=>$c['Rahela Store']->id,        'qty'=>6, 'type'=>'empty_return','return_date'=>$d(10),'is_extra'=>false]);
        $stock->addEmptyStock($b12->id, 6);

        CylinderReturn::create(['cylinder_id'=>$o35->id,'salesman_id'=>$admin->id,'recorded_by'=>$admin->id,'customer_id'=>$c['Hotel Sonar Bangla']->id, 'qty'=>4, 'type'=>'empty_return','return_date'=>$d(9),'is_extra'=>false]);
        $stock->addEmptyStock($o35->id, 4);

        CylinderReturn::create(['cylinder_id'=>$j35->id,'salesman_id'=>$admin->id,'recorded_by'=>$admin->id,'customer_id'=>$c['Dhaka Sweet House']->id,  'qty'=>3, 'type'=>'empty_return','return_date'=>$d(8),'is_extra'=>false]);
        $stock->addEmptyStock($j35->id, 3);

        CylinderReturn::create(['cylinder_id'=>$o12->id,'salesman_id'=>$admin->id,'recorded_by'=>$admin->id,'customer_id'=>$c['Padma Restaurant']->id,   'qty'=>12,'type'=>'empty_return','return_date'=>$d(7),'is_extra'=>false]);
        $stock->addEmptyStock($o12->id, 12);

        // ── 4. SALESMAN FIELD ALLOCATIONS (past, all reconciled) ─────────────
        // Sale prices: Omera 12kg ৳1,350 | Basundhara 12kg ৳1,300
        //              Omera 35kg ৳3,800 | Jamuna 35kg ৳3,750

        // 8 days ago — Karim: 15 Omera 12kg
        $a1 = $allocation->allocate($karim->id, $o12->id, 15, 1350.00, $d(8));
        $allocation->reconcile($a1, 13, 0, 17550.00);

        // 7 days ago — Rafiq: 8 Omera 35kg
        $a2 = $allocation->allocate($rafiq->id, $o35->id, 8, 3800.00, $d(7));
        $allocation->reconcile($a2, 7, 0, 26600.00);

        // 6 days ago — Karim: 12 Basundhara 12kg
        $a3 = $allocation->allocate($karim->id, $b12->id, 12, 1300.00, $d(6));
        $allocation->reconcile($a3, 11, 0, 14300.00);

        // 5 days ago — Jamal: 6 Jamuna 35kg
        $a4 = $allocation->allocate($jamal->id, $j35->id, 6, 3750.00, $d(5));
        $allocation->reconcile($a4, 5, 0, 18750.00);



        // 3 days ago — Rafiq: 5 Omera 35kg + Karim: 15 Omera 12kg
        $a6 = $allocation->allocate($rafiq->id, $o35->id, 5, 3800.00, $d(3));
        $allocation->reconcile($a6, 5, 0, 19000.00);

        $a7 = $allocation->allocate($karim->id, $o12->id, 15, 1350.00, $d(3));
        $allocation->reconcile($a7, 14, 0, 18900.00);

        // 2 days ago — Karim: 8 Basundhara 12kg + Jamal: 4 Jamuna 35kg
        $a8 = $allocation->allocate($karim->id, $b12->id, 8, 1300.00, $d(2));
        $allocation->reconcile($a8, 7, 0, 9100.00);

        $a9 = $allocation->allocate($jamal->id, $j35->id, 4, 3750.00, $d(2));
        $allocation->reconcile($a9, 4, 0, 15000.00);

        // Yesterday — 3 salesmen, various cylinders
        $a10 = $allocation->allocate($karim->id, $o12->id, 10, 1350.00, $d(1));
        $allocation->reconcile($a10, 9, 0, 12150.00);

        $a11 = $allocation->allocate($rafiq->id, $o35->id, 4, 3800.00, $d(1));
        $allocation->reconcile($a11, 3, 0, 11400.00);

        $a12 = $allocation->allocate($jamal->id, $b12->id, 8, 1300.00, $d(1));
        $allocation->reconcile($a12, 7, 0, 9100.00);

        // ── 5. TODAY'S ALLOCATIONS (not yet reconciled) ───────────────────────
        $todayKarim = $allocation->allocate($karim->id, $o12->id, 10, 1350.00, $d(0));
        $todayRafiq = $allocation->allocate($rafiq->id, $j35->id, 5,  3750.00, $d(0));
        $todayJamal = $allocation->allocate($jamal->id, $b12->id, 8,  1300.00, $d(0));

        // Simulate partial sales during the day
        $todayKarim->update(['sold_qty' => 6]);
        $todayRafiq->update(['sold_qty' => 3]);
        $todayJamal->update(['sold_qty' => 5]);

        // ── 6. EXPENSES ───────────────────────────────────────────────────────
        $expenses = [
            [$d(20), 'rent',      20000, 'Monthly depot rent'],
            [$d(18), 'transport',  3500, 'Delivery van — Omera batch'],
            [$d(15), 'transport',  4000, 'Delivery van — Bashundhara + Jamuna batch'],
            [$d(14), 'salary',    10000, 'Karim Uddin monthly salary'],
            [$d(13), 'salary',     9500, 'Rafiq Hossain monthly salary'],
            [$d(12), 'salary',     9000, 'Jamal Mia monthly salary'],
            [$d(12), 'salary',     9500, 'MD FAZLE RABBI monthly salary'],
            [$d(10), 'utility',    4500, 'Electricity, water & phone bill'],
            [$d(9),  'transport',  2800, 'Customer delivery — Gulshan & Banani'],
            [$d(7),  'transport',  3200, 'Padma Gas pickup — Narayanganj'],
            [$d(5),  'other',      1500, 'Cylinder valve repair & maintenance'],
            [$d(3),  'transport',  2500, 'Delivery run — Mirpur & Mohammadpur'],
            [$d(1),  'transport',  1800, "Yesterday's morning delivery"],
            [$d(0),  'transport',  1500, "Today's morning delivery run"],
        ];
        foreach ($expenses as [$date, $cat, $amount, $desc]) {
            Expense::create(['recorded_by'=>$admin->id,'category'=>$cat,'amount'=>$amount,'expense_date'=>$date,'description'=>$desc]);
        }

        // ── 7. CUSTOMER DUE COLLECTIONS ───────────────────────────────────────
        $collections = [
            [$d(12), 'Rahela Store',       4000,  'Partial payment for Basundhara dues'],
            [$d(10), 'Padma Restaurant',   8100,  'Partial settlement — Omera 12kg dues'],
            [$d(8),  'City Garments Ltd',  5000,  'City Garments partial payment'],
            [$d(6),  'Salam Furniture',    5200,  'Full clearance — Salam Furniture'],
            [$d(4),  "Mitu's Kitchen",     11400, 'Mitu Kitchen clears 35kg due'],
            [$d(2),  'Padma Restaurant',   5000,  'Additional payment from Padma Restaurant'],
            [$d(1),  'City Garments Ltd',  3000,  'City Garments follow-up payment'],
        ];
        foreach ($collections as [$date, $custName, $amount, $notes]) {
            $customer = $c[$custName] ?? null;
            if (! $customer) continue;
            DueCollection::create(['customer_id'=>$customer->id,'collected_by'=>$admin->id,'amount'=>$amount,'collection_date'=>$date,'notes'=>$notes]);
            $customer->decrement('total_due', $amount);
        }

        // ── 8. SUPPLIER DUE PAYMENTS ──────────────────────────────────────────
        // Partial payment to Omera for Lot 3
        DuePayment::create(['supplier_id'=>$omera->id,'recorded_by'=>$admin->id,'amount'=>40000,'payment_date'=>$d(10),'notes'=>'Partial payment — Omera Lot 3 balance']);
        $omera->decrement('total_due', 40000);

        // Partial payment to Bashundhara for Lot 5
        DuePayment::create(['supplier_id'=>$bashun->id,'recorded_by'=>$admin->id,'amount'=>15000,'payment_date'=>$d(6),'notes'=>'Partial payment — Bashundhara Lot 5 balance']);
        $bashun->decrement('total_due', 15000);

        $this->command->info('  ✓ Demo data seeded: 7 purchases, 27 counter sales, 12 salesman allocations (12 reconciled + 3 active today), 6 cylinder returns, 14 expenses, 7 collections, 2 supplier payments');
    }

    private function makePurchase(
        int $supplierId, int $adminId, string $date,
        float $total, float $paid,
        array $items,
        StockService $stock
    ): Purchase {
        $purchase = Purchase::create([
            'supplier_id'   => $supplierId,
            'recorded_by'   => $adminId,
            'purchase_date' => $date,
            'total_amount'  => $total,
            'paid_amount'   => $paid,
            'due_amount'    => $total - $paid,
        ]);

        foreach ($items as [$cylinderId, $qty, $unitCost]) {
            PurchaseItem::create([
                'purchase_id'   => $purchase->id,
                'cylinder_id'   => $cylinderId,
                'unit_cost'     => $unitCost,
                'qty'           => $qty,
                'remaining_qty' => $qty,
                'status'        => 'pending',
            ]);
            $stock->addFilledStock($cylinderId, $qty);
        }

        return $purchase;
    }
}
