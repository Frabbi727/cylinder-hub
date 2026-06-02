import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saleService } from '../services/saleService';
import { useState, useMemo } from 'react';

const todayStr = new Date().toISOString().split('T')[0];

export function useSales() {
  const qc = useQueryClient();
  const [payTarget, setPayTarget] = useState(null);

  // All sales (for the All Sales tab and admin view)
  const { data: allSalesData, isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn:  () => saleService.getAll(),
  });

  // Today's sales only (for the Today tab)
  const { data: todaySalesData, isLoading: isTodayLoading } = useQuery({
    queryKey: ['sales-today'],
    queryFn:  () => saleService.getAll(1, true),
    refetchInterval: 30_000,
  });

  const allSales   = allSalesData?.data  || [];
  const todaySales = todaySalesData?.data || [];

  // Computed: outstanding dues (all unpaid across history)
  const outstandingDues = useMemo(
    () => allSales.filter(s => s.due_amount > 0),
    [allSales]
  );

  // Computed: today's cash collected (sum of paid_amount from today's sales)
  const todayCashCollected = useMemo(
    () => todaySales.reduce((sum, s) => sum + parseFloat(s.paid_amount || 0), 0),
    [todaySales]
  );

  const deleteMutation = useMutation({
    mutationFn: saleService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sales-today'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
    },
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => saleService.payBalance(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sales-today'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['my-allocations'] });
      setPayTarget(null);
    },
  });

  return {
    sales:              allSales,
    todaySales,
    outstandingDues,
    todayCashCollected,
    meta:               allSalesData?.meta,
    isLoading:          isLoading || isTodayLoading,
    payTarget, setPayTarget,
    deleteSale:  deleteMutation.mutate,
    isDeleting:  deleteMutation.isPending,
    payBalance:  payMutation.mutate,
    isPaying:    payMutation.isPending,
    payError:    payMutation.error,
  };
}
