<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private DashboardService $dashboardService) {}

    public function index(Request $request): JsonResponse
    {
        [$from, $to] = $this->resolvePeriod(
            $request->get('period', 'today'),
            $request->get('from'),
            $request->get('to')
        );

        return $this->success(
            [
                'summary'      => $this->dashboardService->getSummary($from, $to),
                'weekly_chart' => $this->dashboardService->getWeeklyChart(),
                'recent_sales' => $this->dashboardService->getRecentSales($from, $to),
                'live_stock'   => $this->dashboardService->getLiveStock(),
            ],
            'OK',
            200,
        );
    }

    private function resolvePeriod(string $period, ?string $from, ?string $to): array
    {
        return match ($period) {
            'week'   => [now()->startOfWeek()->toDateString(), now()->toDateString()],
            'month'  => [now()->startOfMonth()->toDateString(), now()->toDateString()],
            'custom' => [$from ?? today()->toDateString(), $to ?? today()->toDateString()],
            default  => [today()->toDateString(), today()->toDateString()],
        };
    }
}
