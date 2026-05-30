<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __construct(private DashboardService $dashboardService) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'summary'      => $this->dashboardService->getTodaySummary(),
            'weekly_chart' => $this->dashboardService->getWeeklyChart(),
            'recent_sales' => $this->dashboardService->getRecentSales(),
            'live_stock'   => $this->dashboardService->getLiveStock(),
        ]);
    }
}
