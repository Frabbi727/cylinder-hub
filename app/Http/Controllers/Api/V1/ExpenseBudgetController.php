<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseBudget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseBudgetController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $month = $request->get('month', now()->format('Y-m'));

        [$year, $mon] = explode('-', $month);

        $categories = ['transport', 'salary', 'rent', 'utility', 'other'];

        $actuals = Expense::whereYear('expense_date', $year)
            ->whereMonth('expense_date', $mon)
            ->select('category', \Illuminate\Support\Facades\DB::raw('SUM(amount) as total'))
            ->groupBy('category')
            ->pluck('total', 'category');

        $budgets = ExpenseBudget::whereIn('category', $categories)
            ->get()
            ->keyBy('category');

        $summary = collect($categories)->map(function ($cat) use ($actuals, $budgets) {
            $actual   = round((float) ($actuals[$cat] ?? 0), 2);
            $budget   = $budgets[$cat] ?? null;
            $budgeted = $budget ? round((float) $budget->monthly_budget, 2) : null;

            $percentUsed  = $budgeted ? round($actual / $budgeted * 100, 1) : null;
            $remaining    = $budgeted !== null ? round($budgeted - $actual, 2) : null;
            $threshold    = $budget?->alert_threshold ?? 80;

            return [
                'category'      => $cat,
                'budgeted'      => $budgeted,
                'actual'        => $actual,
                'remaining'     => $remaining,
                'percent_used'  => $percentUsed,
                'is_over_budget'=> $budgeted !== null && $actual > $budgeted,
                'is_near_limit' => $percentUsed !== null && $percentUsed >= $threshold,
            ];
        })->values()->all();

        return $this->success([
            'month'   => $month,
            'summary' => $summary,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category'        => 'required|in:transport,salary,rent,utility,other',
            'monthly_budget'  => 'required|numeric|min:0',
            'alert_threshold' => 'nullable|integer|min:1|max:100',
        ]);

        $budget = ExpenseBudget::updateOrCreate(
            ['category' => $data['category']],
            [
                'monthly_budget'  => $data['monthly_budget'],
                'alert_threshold' => $data['alert_threshold'] ?? 80,
            ]
        );

        return $this->created($budget);
    }

    public function update(Request $request, ExpenseBudget $budget): JsonResponse
    {
        $data = $request->validate([
            'monthly_budget'  => 'sometimes|numeric|min:0',
            'alert_threshold' => 'sometimes|integer|min:1|max:100',
        ]);

        $budget->update($data);
        return $this->success($budget->fresh());
    }
}
