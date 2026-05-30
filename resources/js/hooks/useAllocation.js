import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesmanService } from '../services/salesmanService';
import { cylinderService } from '../services/cylinderService';
import { useState } from 'react';

export function useAllocation() {
  const qc = useQueryClient();
  const [showAllocate, setShowAllocate] = useState(false);
  const [selectedSalesman, setSelectedSalesman] = useState(null);

  const { data: salesmen, isLoading } = useQuery({
    queryKey: ['salesmen'],
    queryFn:  salesmanService.getAll,
  });

  const { data: cylinders } = useQuery({
    queryKey: ['cylinders'],
    queryFn:  cylinderService.getAll,
  });

  const allocateMutation = useMutation({
    mutationFn: ({ salesmanId, data }) => salesmanService.allocate(salesmanId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salesmen'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAllocate(false);
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: ({ allocationId, data }) => salesmanService.reconcile(allocationId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salesmen'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
    },
  });

  return {
    salesmen:     Array.isArray(salesmen) ? salesmen : [],
    cylinders:    Array.isArray(cylinders) ? cylinders : (cylinders?.data || []),
    isLoading,
    showAllocate, setShowAllocate,
    selectedSalesman, setSelectedSalesman,
    allocate: allocateMutation.mutate,
    reconcile: reconcileMutation.mutate,
    isAllocating: allocateMutation.isPending,
    allocateError: allocateMutation.error,
  };
}
