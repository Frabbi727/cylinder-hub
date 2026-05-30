import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';

export function useDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  dashboardService.get,
    refetchInterval: 60_000,
  });

  return {
    summary:    data?.summary    ?? {},
    weeklyChart:data?.weekly_chart ?? [],
    recentSales:data?.recent_sales ?? [],
    liveStock:  data?.live_stock   ?? [],
    isLoading,
    error,
    refetch,
  };
}
