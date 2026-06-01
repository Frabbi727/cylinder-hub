import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseService } from '../services/purchaseService';
import { cylinderService } from '../services/cylinderService';
import { supplierService } from '../services/supplierService';
import { useState } from 'react';

export function usePurchases() {
  const qc = useQueryClient();
  const [showAdd,   setShowAdd]   = useState(false);
  const [payTarget, setPayTarget] = useState(null); // purchase to pay balance on
  const [simulation, setSimulation] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn:  () => purchaseService.getAll(),
  });

  const { data: cylinders } = useQuery({
    queryKey: ['cylinders'],
    queryFn:  cylinderService.getAll,
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn:  () => supplierService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: purchaseService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAdd(false);
    },
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => purchaseService.payBalance(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setPayTarget(null);
    },
  });

  const simulateSale = async (cylinderId, qty, unitPrice) => {
    setSimLoading(true);
    setSimulation(null);
    try {
      const result = await purchaseService.simulate({ cylinder_id: cylinderId, qty, unit_price: unitPrice });
      setSimulation(result);
    } finally {
      setSimLoading(false);
    }
  };

  return {
    purchases: purchases?.data || [],
    meta:      purchases?.meta,
    isLoading,
    cylinders: Array.isArray(cylinders) ? cylinders : (cylinders?.data || []),
    suppliers: suppliers?.data || [],
    showAdd, setShowAdd,
    payTarget, setPayTarget,
    createPurchase: createMutation.mutate,
    isCreating:     createMutation.isPending,
    createError:    createMutation.error,
    payBalance:     payMutation.mutate,
    isPaying:       payMutation.isPending,
    payError:       payMutation.error,
    simulation, simulateSale, simLoading,
  };
}
