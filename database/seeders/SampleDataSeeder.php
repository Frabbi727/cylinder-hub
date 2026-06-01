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

        // ── Lookup core entities by name so IDs don't matter ──────────────────
        $admin = User::where('role', 'admin')->first();
        $karim = User::where('email', 'karim@cylinderhub.com')->first();
        $rafiq = User::where('email', 'rafiq@cylinderhub.com')->first();
        $jamal = User::where('email', 'jamal@cylinderhub.com')->first();

        $lpg12 = Cylinder::where('size', '12 kg')->first();
        $lpg35 = Cylinder::where('size', '35 kg')->first();
        $petro = Cylinder::where('short_code', 'PX')->first();
        $ind45 = Cylinder::where('short_code', '45')->first();

        $omera  = Supplier::where('name', 'Omera Petroleum')->first();
        $bashun = Supplier::where('name', 'Bashundhara LP')->first();
        $jamuna = Supplier::where('name', 'Jamuna Dealer')->first();
        $self   = Supplier::where('name', 'Self')->first();

        // ── 1. Reset all running totals so demo data is self-consistent ────────
        CylinderStock::query()->update(['filled_qty' => 0, 'empty_qty' => 0]);
        Customer::query()->update(['total_due' => 0]);
        Supplier::query()->update(['total_due' => 0]);

        // ── 2. Add more customers ─────────────────────────────────────────────
        $newCustomers = [
            ["Mitu's Kitchen",    '01733-221144', null],
            ['City Garments Ltd', '01833-773344', 'Mirpur DOHS, Dhaka'],
            ['Salam Furniture',   '01844-335566', 'Gulshan-2, Dhaka'],
            ['Green Valley Hotel','01955-447788', 'Banani, Dhaka'],
            ['Raju Tea Stall',    '01611-559900', null],
            ['Dhaka Sweet House', '01722-661122', 'Dhanmondi, Dhaka'],
        ];
        foreach ($newCustomers as [$name, $phone, $address]) {
            Customer::firstOrCreate(['name' => $name], [
                'phone' => $phone, 'address' => $address, 'added_by' => $admin->id,
            ]);
        }

        // Build a quick-lookup map: customer name → model
        $c = Customer::all()->keyBy('name');

        // ── 3. Purchases — 7 lots across 2 weeks ──────────────────────────────
        // Each purchase: adds filled stock + creates FIFO lot

        // Lot A — LP Gas 12 kg @ ৳1,165 (May 15, oldest, will be DONE after sales)
        $this->makePurchase($bashun->id, $admin->id, '2026-05-15', 93200, 93200,
            [[$lpg12->id, 80, 1165.00]], $stock);

        // Lot D — LP Gas 35 kg @ ৳3,050 (May 15, partially paid)
        $this->makePurchase($jamuna->id, $admin->id, '2026-05-15', 91500, 60000,
            [[$lpg35->id, 30, 3050.00]], $stock);
        $jamuna->increment('total_due', 31500);

        // Lot F — Petromax @ ৳90 (May 15, will be DONE after sales)
        $this->makePurchase($self->id, $admin->id, '2026-05-15', 1800, 1800,
            [[$petro->id, 20, 90.00]], $stock);

        // Lot B — LP Gas 12 kg @ ৳1,175 (May 20, partially paid — cost went up slightly)
        $this->makePurchase($omera->id, $admin->id, '2026-05-20', 70500, 50000,
            [[$lpg12->id, 60, 1175.00]], $stock);
        $omera->increment('total_due', 20500);

        // Lot G — Petromax @ ৳80 (May 22, a cheaper lot — interesting FIFO inversion)
        $this->makePurchase($self->id, $admin->id, '2026-05-22', 1200, 1200,
            [[$petro->id, 15, 80.00]], $stock);

        // Lot C — LP Gas 12 kg @ ৳1,180 (May 24, most expensive 12 kg lot so far)
        $this->makePurchase($bashun->id, $admin->id, '2026-05-24', 70800, 70800,
            [[$lpg12->id, 60, 1180.00]], $stock);

        // Lot E — LP Gas 35 kg @ ৳3,100 (May 27, price up from Lot D)
        $this->makePurchase($jamuna->id, $admin->id, '2026-05-27', 62000, 62000,
            [[$lpg35->id, 20, 3100.00]], $stock);

        // ── 4. Direct counter sales — 15 days of real business ────────────────
        // These go through SaleService: FIFO lots consumed, customer due updated

        // === LP Gas 12 kg sales — 110 pcs total ===
        // (exhausts Lot A entirely, consumes 30 from Lot B; Lot C untouched)

        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Hotel Sonar Bangla']->id,'sale_date'=>'2026-05-16','payment_type'=>'cash',  'paid_amount'=>4350, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>3,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Nodi General Store']->id,'sale_date'=>'2026-05-16','payment_type'=>'cash',  'paid_amount'=>2900, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>2,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Padma Restaurant']->id,  'sale_date'=>'2026-05-17','payment_type'=>'due',   'paid_amount'=>0,    'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>6,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Green Valley Hotel']->id,'sale_date'=>'2026-05-18','payment_type'=>'cash',  'paid_amount'=>11600,'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>8,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['City Garments Ltd']->id, 'sale_date'=>'2026-05-19','payment_type'=>'partial','paid_amount'=>5000, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>4,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>null,                        'sale_date'=>'2026-05-19','payment_type'=>'cash',  'paid_amount'=>5800, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>4,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Padma Restaurant']->id,  'sale_date'=>'2026-05-20','payment_type'=>'due',   'paid_amount'=>0,    'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>7,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Hotel Sonar Bangla']->id,'sale_date'=>'2026-05-20','payment_type'=>'cash',  'paid_amount'=>7250, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>5,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Salam Furniture']->id,  'sale_date'=>'2026-05-21','payment_type'=>'partial','paid_amount'=>3000, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>4,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Raju Tea Stall']->id,   'sale_date'=>'2026-05-21','payment_type'=>'cash',  'paid_amount'=>2900, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>2,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['City Garments Ltd']->id, 'sale_date'=>'2026-05-22','payment_type'=>'due',   'paid_amount'=>0,    'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>8,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Mitu\'s Kitchen']->id,  'sale_date'=>'2026-05-22','payment_type'=>'cash',  'paid_amount'=>4350, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>3,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Nodi General Store']->id,'sale_date'=>'2026-05-23','payment_type'=>'cash',  'paid_amount'=>7250, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>5,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Dhaka Sweet House']->id,'sale_date'=>'2026-05-23','payment_type'=>'cash',  'paid_amount'=>4350, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>3,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Green Valley Hotel']->id,'sale_date'=>'2026-05-24','payment_type'=>'cash',  'paid_amount'=>8700, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>6,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Dhaka Sweet House']->id,'sale_date'=>'2026-05-25','payment_type'=>'cash',  'paid_amount'=>7250, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>5,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Mitu\'s Kitchen']->id,  'sale_date'=>'2026-05-25','payment_type'=>'cash',  'paid_amount'=>7250, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>5,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>null,                        'sale_date'=>'2026-05-26','payment_type'=>'cash',  'paid_amount'=>7250, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>5,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Padma Restaurant']->id,  'sale_date'=>'2026-05-27','payment_type'=>'due',   'paid_amount'=>0,    'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>5,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Hotel Sonar Bangla']->id,'sale_date'=>'2026-05-28','payment_type'=>'cash',  'paid_amount'=>4350, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>3,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Raju Tea Stall']->id,   'sale_date'=>'2026-05-29','payment_type'=>'partial','paid_amount'=>3000, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>4,'unit_price'=>1450]]]);
        // Today's counter sales — show up on dashboard
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Hotel Sonar Bangla']->id,'sale_date'=>'2026-05-30','payment_type'=>'cash',  'paid_amount'=>7250, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>5,'unit_price'=>1450]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Green Valley Hotel']->id,'sale_date'=>'2026-05-30','payment_type'=>'cash',  'paid_amount'=>2900, 'items'=>[['cylinder_id'=>$lpg12->id,'qty'=>2,'unit_price'=>1450]]]);
        // Total LP12 counter sales = 3+2+6+8+4+4+7+5+4+2+8+3+5+3+6+5+5+5+5+3+4+5+2 = 110 ✓

        // === LP Gas 35 kg sales — 20 pcs total ===
        // (consumes 20 from Lot D, leaving 10 remaining; Lot E untouched)

        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Green Valley Hotel']->id,'sale_date'=>'2026-05-16','payment_type'=>'cash',  'paid_amount'=>11400,'items'=>[['cylinder_id'=>$lpg35->id,'qty'=>3,'unit_price'=>3800]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Dhaka Sweet House']->id,'sale_date'=>'2026-05-17','payment_type'=>'cash',  'paid_amount'=>7600, 'items'=>[['cylinder_id'=>$lpg35->id,'qty'=>2,'unit_price'=>3800]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Hotel Sonar Bangla']->id,'sale_date'=>'2026-05-19','payment_type'=>'cash',  'paid_amount'=>11400,'items'=>[['cylinder_id'=>$lpg35->id,'qty'=>3,'unit_price'=>3800]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Mitu\'s Kitchen']->id,  'sale_date'=>'2026-05-21','payment_type'=>'due',   'paid_amount'=>0,    'items'=>[['cylinder_id'=>$lpg35->id,'qty'=>4,'unit_price'=>3800]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['City Garments Ltd']->id, 'sale_date'=>'2026-05-23','payment_type'=>'cash',  'paid_amount'=>7600, 'items'=>[['cylinder_id'=>$lpg35->id,'qty'=>2,'unit_price'=>3800]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Green Valley Hotel']->id,'sale_date'=>'2026-05-25','payment_type'=>'partial','paid_amount'=>5000, 'items'=>[['cylinder_id'=>$lpg35->id,'qty'=>2,'unit_price'=>3800]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Hotel Sonar Bangla']->id,'sale_date'=>'2026-05-27','payment_type'=>'cash',  'paid_amount'=>7600, 'items'=>[['cylinder_id'=>$lpg35->id,'qty'=>2,'unit_price'=>3800]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Padma Restaurant']->id,  'sale_date'=>'2026-05-28','payment_type'=>'cash',  'paid_amount'=>7600, 'items'=>[['cylinder_id'=>$lpg35->id,'qty'=>2,'unit_price'=>3800]]]);
        // Total LP35 = 3+2+3+4+2+2+2+2 = 20 ✓

        // === Petromax sales — 20 pcs total ===
        // (exhausts Lot F @ ৳90; Lot G @ ৳80 stays untouched — shows FIFO state)

        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Rahela Store']->id,      'sale_date'=>'2026-05-16','payment_type'=>'due',   'paid_amount'=>0,    'items'=>[['cylinder_id'=>$petro->id,'qty'=>5,'unit_price'=>200]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Raju Tea Stall']->id,   'sale_date'=>'2026-05-17','payment_type'=>'cash',  'paid_amount'=>600,  'items'=>[['cylinder_id'=>$petro->id,'qty'=>3,'unit_price'=>200]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Nodi General Store']->id,'sale_date'=>'2026-05-18','payment_type'=>'cash',  'paid_amount'=>800,  'items'=>[['cylinder_id'=>$petro->id,'qty'=>4,'unit_price'=>200]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Rahela Store']->id,      'sale_date'=>'2026-05-19','payment_type'=>'due',   'paid_amount'=>0,    'items'=>[['cylinder_id'=>$petro->id,'qty'=>4,'unit_price'=>200]]]);
        $sale->createSale(['salesman_id'=>$admin->id,'customer_id'=>$c['Raju Tea Stall']->id,   'sale_date'=>'2026-05-20','payment_type'=>'cash',  'paid_amount'=>800,  'items'=>[['cylinder_id'=>$petro->id,'qty'=>4,'unit_price'=>200]]]);
        // Total Petro = 5+3+4+4+4 = 20 ✓ (all from Lot F @ ৳90, profit = 110/pc)

        // ── 5. Empty cylinder returns from customers ───────────────────────────
        CylinderReturn::create(['cylinder_id'=>$lpg12->id,'recorded_by'=>$admin->id,'customer_id'=>$c['City Garments Ltd']->id,'qty'=>15,'type'=>'empty_return','return_date'=>'2026-05-18','notes'=>'15 empty LP 12kg returned by City Garments']);
        $stock->addEmptyStock($lpg12->id, 15);

        CylinderReturn::create(['cylinder_id'=>$lpg35->id,'recorded_by'=>$admin->id,'customer_id'=>$c['Hotel Sonar Bangla']->id,'qty'=>8,'type'=>'empty_return','return_date'=>'2026-05-21','notes'=>'8 empty LP 35kg returned by Hotel Sonar Bangla']);
        $stock->addEmptyStock($lpg35->id, 8);

        CylinderReturn::create(['cylinder_id'=>$petro->id,'recorded_by'=>$admin->id,'customer_id'=>$c['Rahela Store']->id,'qty'=>10,'type'=>'empty_return','return_date'=>'2026-05-24','notes'=>'10 empty Petromax returned by Rahela Store']);
        $stock->addEmptyStock($petro->id, 10);

        CylinderReturn::create(['cylinder_id'=>$lpg12->id,'recorded_by'=>$admin->id,'customer_id'=>$c['Padma Restaurant']->id,'qty'=>12,'type'=>'empty_return','return_date'=>'2026-05-27','notes'=>'12 empty LP 12kg returned by Padma Restaurant']);
        $stock->addEmptyStock($lpg12->id, 12);

        CylinderReturn::create(['cylinder_id'=>$lpg35->id,'recorded_by'=>$admin->id,'customer_id'=>$c['Green Valley Hotel']->id,'qty'=>4,'type'=>'empty_return','return_date'=>'2026-05-29','notes'=>'4 empty LP 35kg returned by Green Valley Hotel']);
        $stock->addEmptyStock($lpg35->id, 4);

        // ── 6. Salesman allocations — past days (reconciled) ──────────────────
        // Karim handles LP Gas 12 kg in the field
        // Rafiq handles LP Gas 35 kg in the field
        // Jamal handles Petromax in the field

        // May 24 — Karim: 12 LP12
        $a1 = $allocation->allocate($karim->id, $lpg12->id, 12, '2026-05-24');
        $allocation->reconcile($a1, 10, 2, 14500.00);  // sold 10, returned 2 empty, collected ৳14,500

        // May 26 — Karim: 12 LP12
        $a2 = $allocation->allocate($karim->id, $lpg12->id, 12, '2026-05-26');
        $allocation->reconcile($a2, 11, 1, 15950.00);  // sold 11, returned 1 empty, collected ৳15,950

        // May 27 — Rafiq: 8 LP35
        $a3 = $allocation->allocate($rafiq->id, $lpg35->id, 8, '2026-05-27');
        $allocation->reconcile($a3, 6, 2, 22800.00);   // sold 6 @ 3800 = 22,800

        // May 28 — Jamal: 6 Petromax
        $a4 = $allocation->allocate($jamal->id, $petro->id, 6, '2026-05-28');
        $allocation->reconcile($a4, 5, 1, 1000.00);    // sold 5 @ 200 = 1,000

        // May 28 — Karim: 10 LP12
        $a5 = $allocation->allocate($karim->id, $lpg12->id, 10, '2026-05-28');
        $allocation->reconcile($a5, 9, 1, 13050.00);   // sold 9, collected ৳13,050

        // May 29 — Rafiq: 5 LP35
        $a6 = $allocation->allocate($rafiq->id, $lpg35->id, 5, '2026-05-29');
        $allocation->reconcile($a6, 4, 1, 15200.00);   // sold 4 @ 3800 = 15,200

        // ── 7. TODAY's allocations — not yet reconciled ───────────────────────
        // These appear on Allocation page as active tasks for today

        $todayKarim = $allocation->allocate($karim->id, $lpg12->id, 10, '2026-05-30');
        $todayRafiq = $allocation->allocate($rafiq->id, $lpg35->id, 4,  '2026-05-30');
        $todayJamal = $allocation->allocate($jamal->id, $petro->id,  5,  '2026-05-30');

        // Simulate some field sales by salesmen today (update sold_qty directly,
        // as they are in the field and will be reconciled at end of day)
        $todayKarim->update(['sold_qty' => 6, 'collected_amount' => 8700.00]);
        $todayRafiq->update(['sold_qty' => 2, 'collected_amount' => 7600.00]);
        $todayJamal->update(['sold_qty' => 3, 'collected_amount' => 600.00]);

        // ── 8. Expenses — 11 entries covering this month ──────────────────────
        $expenses = [
            ['2026-05-15', 'rent',      15000, 'Monthly shop rent — May 2026'],
            ['2026-05-16', 'transport',  2500, 'Delivery van — LP Gas batch'],
            ['2026-05-19', 'transport',  1800, 'Customer delivery — Gulshan area'],
            ['2026-05-20', 'salary',     8000, "Karim Uddin salary — May 2026"],
            ['2026-05-22', 'utility',    3200, 'Electricity + water bill — May'],
            ['2026-05-24', 'transport',  2000, 'Pickup truck hire — Petromax batch'],
            ['2026-05-25', 'salary',     7500, "Rafiq Hossain salary — May 2026"],
            ['2026-05-27', 'salary',     7000, "Jamal Mia salary — May 2026"],
            ['2026-05-28', 'other',      1200, 'Gas stove repair — workshop'],
            ['2026-05-29', 'transport',  2500, 'Delivery — Banani & Mirpur route'],
            ['2026-05-30', 'transport',  1500, "Today's morning delivery run"],
        ];
        foreach ($expenses as [$date, $cat, $amount, $desc]) {
            Expense::create(['recorded_by'=>$admin->id,'category'=>$cat,'amount'=>$amount,'expense_date'=>$date,'description'=>$desc]);
        }

        // ── 9. Customer due collections ───────────────────────────────────────
        $collections = [
            ['2026-05-22', $c['Rahela Store'],      1500,  'Partial payment for May Petromax dues'],
            ['2026-05-24', $c['Padma Restaurant'],  12000, 'Large payment — cleared most of May dues'],
            ['2026-05-25', $c['City Garments Ltd'], 8000,  'Partial settlement — City Garments account'],
            ['2026-05-27', $c['Salam Furniture'],   5800,  'Full clearance of Salam Furniture account'],
            ['2026-05-29', $c['Padma Restaurant'],  5000,  'Additional payment from Padma Restaurant'],
            ['2026-05-30', $c['City Garments Ltd'], 4000,  'Today — City Garments partial payment'],
        ];
        foreach ($collections as [$date, $customer, $amount, $notes]) {
            DueCollection::create(['customer_id'=>$customer->id,'collected_by'=>$admin->id,'amount'=>$amount,'collection_date'=>$date,'notes'=>$notes]);
            $customer->decrement('total_due', $amount);
        }

        // ── 10. Supplier due payments ─────────────────────────────────────────
        // Clear Jamuna Dealer's full outstanding
        DuePayment::create(['supplier_id'=>$jamuna->id,'recorded_by'=>$admin->id,'amount'=>31500,'payment_date'=>'2026-05-24','notes'=>'Full clearance of LP 35 kg May 15 purchase balance']);
        $jamuna->decrement('total_due', 31500);

        // Partial payment to Omera for the May 20 purchase
        DuePayment::create(['supplier_id'=>$omera->id,'recorded_by'=>$admin->id,'amount'=>10000,'payment_date'=>'2026-05-26','notes'=>'Partial payment — LP 12 kg Lot B balance']);
        $omera->decrement('total_due', 10000);

        // ── 11. Restore Industrial Gas stock (inactive, not used in demo) ──────
        CylinderStock::where('cylinder_id', $ind45->id)
            ->update(['filled_qty' => 6, 'empty_qty' => 4]);

        $this->command->info('  ✓ Demo data seeded: 7 purchases, 30 sales, 7 allocations, 11 expenses, 6 collections, 2 supplier payments');
    }

    // ── Helper: create a purchase + purchase items + add to stock ────────────
    private function makePurchase(
        int $supplierId, int $adminId, string $date,
        float $total, float $paid,
        array $items, // [[cylinder_id, qty, unit_cost], ...]
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
