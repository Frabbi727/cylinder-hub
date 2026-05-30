import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '../services/customerService';
import { useState } from 'react';

export function useCustomers() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd]           = useState(false);
  const [showCollect, setShowCollect]   = useState(false);
  const [selected, setSelected]         = useState(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn:  () => customerService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setShowAdd(false); },
  });

  const collectMutation = useMutation({
    mutationFn: ({ id, data }) => customerService.collect(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowCollect(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: customerService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  return {
    customers: customers?.data || [],
    isLoading,
    showAdd, setShowAdd,
    showCollect, setShowCollect,
    selected, setSelected,
    createCustomer: createMutation.mutate,
    collectDue: collectMutation.mutate,
    deleteCustomer: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isCollecting: collectMutation.isPending,
  };
}
