import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '../services/expenseService';
import { useState } from 'react';

export function useExpenses() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const now = new Date();
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', now.getMonth() + 1, now.getFullYear()],
    queryFn:  () => expenseService.getAll(1, now.getMonth() + 1, now.getFullYear()),
  });

  const createMutation = useMutation({
    mutationFn: expenseService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAdd(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: expenseService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });

  return {
    expenses:  expenses?.data || [],
    meta:      expenses?.meta,
    isLoading,
    showAdd, setShowAdd,
    createExpense: createMutation.mutate,
    deleteExpense: deleteMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
