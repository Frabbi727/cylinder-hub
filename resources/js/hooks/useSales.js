import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saleService } from '../services/saleService';
import { cylinderService } from '../services/cylinderService';
import { customerService } from '../services/customerService';
import { useState } from 'react';

export function useSales() {
  const qc = useQueryClient();
  const [showAdd,     setShowAdd]     = useState(false);
  const [payTarget,   setPayTarget]   = useState(null); // sale to pay balance on

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn:  () => saleService.getAll(),
  });

  const { data: cylinders } = useQuery({
    queryKey: ['cylinders'],
    queryFn:  cylinderService.getAll,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn:  () => customerService.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: saleService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
    },
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => saleService.payBalance(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      setPayTarget(null);
    },
  });

  return {
    sales:     sales?.data || [],
    meta:      sales?.meta,
    isLoading,
    cylinders: Array.isArray(cylinders) ? cylinders : (cylinders?.data || []),
    customers: customers?.data || [],
    showAdd, setShowAdd,
    payTarget, setPayTarget,
    deleteSale:  deleteMutation.mutate,
    isDeleting:  deleteMutation.isPending,
    payBalance:  payMutation.mutate,
    isPaying:    payMutation.isPending,
    payError:    payMutation.error,
  };
}
