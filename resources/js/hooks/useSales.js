import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saleService } from '../services/saleService';
import { cylinderService } from '../services/cylinderService';
import { customerService } from '../services/customerService';
import { useState } from 'react';

export function useSales() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

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

  return {
    sales:     sales?.data || [],
    meta:      sales?.meta,
    isLoading,
    cylinders: Array.isArray(cylinders) ? cylinders : (cylinders?.data || []),
    customers: customers?.data || [],
    showAdd, setShowAdd,
    deleteSale: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
