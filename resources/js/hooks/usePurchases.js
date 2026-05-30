import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseService } from '../services/purchaseService';
import { cylinderService } from '../services/cylinderService';
import { supplierService } from '../services/supplierService';
import { useState } from 'react';

export function usePurchases() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
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

  const purchaseList = purchases?.data || [];
  const cylinderList = Array.isArray(cylinders) ? cylinders : (cylinders?.data || []);
  const supplierList = suppliers?.data || [];

  return {
    purchases: purchaseList,
    meta: purchases?.meta,
    isLoading,
    cylinders: cylinderList,
    suppliers: supplierList,
    showAdd, setShowAdd,
    createPurchase: createMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    simulation, simulateSale, simLoading,
  };
}
