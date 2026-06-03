<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreCustomerRequest;
use App\Models\Customer;
use App\Models\CylinderReturn;
use App\Models\DueCollection;
use App\Models\SaleItem;
use App\Repositories\Contracts\CustomerRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function __construct(private CustomerRepositoryInterface $customers) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->has('search')) {
            return $this->success($this->customers->search($request->search));
        }

        return $this->paginated($this->customers->paginate());
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $data             = $request->validated();
        $data['added_by'] = auth()->id();
        $customer         = $this->customers->create($data);

        return $this->created($customer);
    }

    public function show(Customer $customer): JsonResponse
    {
        return $this->success($customer->load(['sales', 'dueCollections']));
    }

    public function update(StoreCustomerRequest $request, Customer $customer): JsonResponse
    {
        $customer = $this->customers->update($customer, $request->validated());
        return $this->success($customer);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $this->customers->delete($customer);
        return $this->deleted('Customer deleted.');
    }

    public function collect(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate([
            'amount'          => ['required', 'numeric', 'min:0.01', 'max:'.(float) $customer->total_due],
            'collection_date' => 'required|date',
            'sale_id'         => 'nullable|integer|exists:sales,id',
            'notes'           => 'nullable|string',
        ]);

        DueCollection::create([
            'customer_id'     => $customer->id,
            'sale_id'         => $data['sale_id'] ?? null,
            'collected_by'    => auth()->id(),
            'amount'          => $data['amount'],
            'collection_date' => $data['collection_date'],
            'notes'           => $data['notes'] ?? null,
        ]);

        $customer->decrement('total_due', $data['amount']);
        return $this->success($customer->fresh(), 'Payment collected.');
    }

    public function overdue(Request $request): JsonResponse
    {
        $days = max(0, (int) $request->get('days', 7));
        $sort = $request->get('sort', 'amount_desc');

        $query = DB::table('sales as s')
            ->join('customers as c', 'c.id', '=', 's.customer_id')
            ->selectRaw('
                c.id as customer_id,
                c.name,
                c.phone,
                c.total_due,
                MIN(s.sale_date) as oldest_due_date,
                DATEDIFF(CURDATE(), MIN(s.sale_date)) as days_overdue,
                COUNT(s.id) as unpaid_sales_count,
                (SELECT u.name FROM users u
                 INNER JOIN sales s2 ON s2.salesman_id = u.id
                 WHERE s2.customer_id = c.id
                   AND s2.deleted_at IS NULL
                   AND (s2.total_amount - s2.paid_amount) > 0
                 ORDER BY s2.sale_date ASC LIMIT 1) as salesman_name
            ')
            ->whereNull('s.deleted_at')
            ->whereRaw('(s.total_amount - s.paid_amount) > 0')
            ->whereNotNull('s.customer_id')
            ->groupBy('c.id', 'c.name', 'c.phone', 'c.total_due')
            ->havingRaw('DATEDIFF(CURDATE(), MIN(s.sale_date)) >= ?', [$days]);

        match ($sort) {
            'amount_asc' => $query->orderBy('c.total_due', 'asc'),
            'days_desc'  => $query->orderByRaw('DATEDIFF(CURDATE(), MIN(s.sale_date)) DESC'),
            'days_asc'   => $query->orderByRaw('DATEDIFF(CURDATE(), MIN(s.sale_date)) ASC'),
            default      => $query->orderBy('c.total_due', 'desc'),
        };

        $results = $query->get()->map(fn ($row) => [
            'customer_id'       => $row->customer_id,
            'name'              => $row->name,
            'phone'             => $row->phone,
            'total_due'         => round((float) $row->total_due, 2),
            'oldest_due_date'   => $row->oldest_due_date,
            'days_overdue'      => (int) $row->days_overdue,
            'unpaid_sales_count'=> (int) $row->unpaid_sales_count,
            'salesman_name'     => $row->salesman_name,
        ]);

        return $this->success($results, 'OK', 200);
    }

    public function empties(Customer $customer): JsonResponse
    {
        // Total cylinders sold to this customer, grouped by cylinder type
        $sold = SaleItem::select('cylinder_id', DB::raw('SUM(qty) as sold_qty'))
            ->whereHas('sale', fn ($q) => $q->where('customer_id', $customer->id)->whereNull('deleted_at'))
            ->groupBy('cylinder_id')
            ->with('cylinder')
            ->get()
            ->keyBy('cylinder_id');

        // Total empties already returned by this customer
        $returned = CylinderReturn::select('cylinder_id', DB::raw('SUM(qty) as returned_qty'))
            ->where('customer_id', $customer->id)
            ->where('type', 'empty_return')
            ->where(fn ($q) => $q->whereNull('is_verified')->orWhere('is_verified', true))
            ->groupBy('cylinder_id')
            ->get()
            ->keyBy('cylinder_id');

        // Merge into a balance per cylinder
        $allCylinderIds = $sold->keys()->merge($returned->keys())->unique();

        $balances = $allCylinderIds->map(function ($cylinderId) use ($sold, $returned) {
            $soldRow     = $sold->get($cylinderId);
            $returnedRow = $returned->get($cylinderId);

            $soldQty     = (int) ($soldRow?->sold_qty     ?? 0);
            $returnedQty = (int) ($returnedRow?->returned_qty ?? 0);
            $pending     = max(0, $soldQty - $returnedQty);

            $cylinder = $soldRow?->cylinder ?? $returnedRow?->cylinder ?? null;

            return [
                'cylinder_id'   => $cylinderId,
                'cylinder_name' => $cylinder?->name,
                'cylinder_size' => $cylinder?->size,
                'color1'        => $cylinder?->color1,
                'color2'        => $cylinder?->color2,
                'sold_qty'      => $soldQty,
                'returned_qty'  => $returnedQty,
                'pending_qty'   => $pending,
            ];
        })->values();

        return $this->success([
            'customer'  => ['id' => $customer->id, 'name' => $customer->name],
            'balances'  => $balances,
            'total_pending' => $balances->sum('pending_qty'),
        ]);
    }
}
