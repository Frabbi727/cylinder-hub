import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { useState } from 'react';

const todayStr = new Date().toISOString().split('T')[0];

export function useDashboard() {
  const [period,      setPeriod]      = useState('today');
  const [customFrom,  setCustomFrom]  = useState(todayStr);
  const [customTo,    setCustomTo]    = useState(todayStr);

  const params = {
    period,
    ...(period === 'custom' ? { from: customFrom, to: customTo } : {}),
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', period, customFrom, customTo],
    queryFn:  () => dashboardService.get(params),
    refetchInterval: 60_000,
    // Don't fetch custom until both dates are set
    enabled: period !== 'custom' || (!!customFrom && !!customTo),
  });

  return {
    summary:    data?.summary     ?? {},
    weeklyChart:data?.weekly_chart ?? [],
    recentSales:data?.recent_sales ?? [],
    liveStock:  data?.live_stock   ?? [],
    isLoading,
    error,
    refetch,
    period, setPeriod,
    customFrom, setCustomFrom,
    customTo,   setCustomTo,
  };
}
