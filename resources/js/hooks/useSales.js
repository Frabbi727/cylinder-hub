import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saleService } from '../services/saleService';
import { useState, useMemo } from 'react';

export function useSales(filters = {}) {
  const qc = useQueryClient();
  const [payTarget, setPayTarget] = useState(null);

  const { data: allSalesData, isLoading } = useQuery({
    queryKey: ['sales', filters],
    queryFn:  () => saleService.getAll(filters),
  });

  const { data: todaySalesData, isLoading: isTodayLoading } = useQuery({
    queryKey: ['sales-today'],
    queryFn:  () => saleService.getAll({ today: true }),
    refetchInterval: 30_000,
  });

  const allSales   = allSalesData?.data  || [];
  const todaySales = todaySalesData?.data || [];

  const outstandingDues = useMemo(
    () => allSales.filter(s => parseFloat(s.due_amount || 0) > 0),
    [allSales]
  );

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
      qc.invalidateQueries({ queryKey: ['sales-dues'] });
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
