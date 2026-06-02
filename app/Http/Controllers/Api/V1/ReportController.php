<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private ReportService $reports) {}

    public function pnl(Request $request): JsonResponse
    {
        [$from, $to] = $this->resolvePeriod($request);
        return $this->success($this->reports->pnl($from, $to));
    }

    public function cashflow(Request $request): JsonResponse
    {
        [$from, $to] = $this->resolvePeriod($request);
        return $this->success($this->reports->cashflow($from, $to));
    }

    public function purchases(Request $request): JsonResponse
    {
        [$from, $to] = $this->resolvePeriod($request);
        return $this->success($this->reports->purchases($from, $to));
    }

    private function resolvePeriod(Request $request): array
    {
        $period = $request->get('period', 'month');
        $from   = $request->get('from');
        $to     = $request->get('to');

        return match ($period) {
            'today'  => [today()->toDateString(), today()->toDateString()],
            'week'   => [now()->startOfWeek()->toDateString(), now()->toDateString()],
            'custom' => [$from ?? today()->toDateString(), $to ?? today()->toDateString()],
            default  => [now()->startOfMonth()->toDateString(), now()->toDateString()],
        };
    }
}
