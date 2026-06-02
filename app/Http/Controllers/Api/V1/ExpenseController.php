<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreExpenseRequest;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Expense::with('recordedBy')->orderByDesc('expense_date');

        $filters = [];

        if ($request->has('month') && $request->has('year')) {
            $query->whereMonth('expense_date', $request->month)
                  ->whereYear('expense_date', $request->year);
            $filters = ['month' => $request->month, 'year' => $request->year];
        }

        return $this->paginated($query->paginate(15), 'OK', $filters);
    }

    public function store(StoreExpenseRequest $request): JsonResponse
    {
        $data                = $request->validated();
        $data['recorded_by'] = auth()->id();
        $expense             = Expense::create($data);

        return $this->created($expense->load('recordedBy'));
    }

    public function show(Expense $expense): JsonResponse
    {
        return $this->success($expense->load('recordedBy'));
    }

    public function update(StoreExpenseRequest $request, Expense $expense): JsonResponse
    {
        $expense->update($request->validated());
        return $this->success($expense->fresh('recordedBy'));
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $expense->delete();
        return $this->deleted('Expense deleted.');
    }
}
