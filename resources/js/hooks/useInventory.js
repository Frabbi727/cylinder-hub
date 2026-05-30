import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cylinderService } from '../services/cylinderService';
import { stockService } from '../services/stockService';
import { useState } from 'react';

export function useInventory() {
  const qc = useQueryClient();
  const [showAddCylinder, setShowAddCylinder] = useState(false);
  const [tab, setTab] = useState('stock');

  const { data: cylinders, isLoading } = useQuery({
    queryKey: ['cylinders'],
    queryFn:  cylinderService.getAll,
  });

  const { data: stock } = useQuery({
    queryKey: ['stock'],
    queryFn:  stockService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: cylinderService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cylinders'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      setShowAddCylinder(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => cylinderService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cylinders'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: cylinderService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cylinders'] }),
  });

  // Enrich stock data with cylinder info
  const stockMap = {};
  if (stock) {
    (Array.isArray(stock) ? stock : stock.data || []).forEach(s => {
      stockMap[s.cylinder_id] = s;
    });
  }

  const cylinderList = Array.isArray(cylinders) ? cylinders : (cylinders?.data || []);
  const enrichedCylinders = cylinderList.map(c => ({
    ...c,
    stock: stockMap[c.id] || { filled_qty: 0, empty_qty: 0, capacity: c.capacity },
  }));

  return {
    cylinders: enrichedCylinders,
    isLoading,
    tab, setTab,
    showAddCylinder, setShowAddCylinder,
    createCylinder: createMutation.mutate,
    updateCylinder: updateMutation.mutate,
    deleteCylinder: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
  };
}
