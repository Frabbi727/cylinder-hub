import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesmanService } from '../services/salesmanService';
import { cylinderService } from '../services/cylinderService';
import { useState } from 'react';

const ALLOC_FORM_DEFAULT = { cylinder_id: '', qty: 1 };
const SALESMAN_FORM_DEFAULT = { name: '', email: '', password: '', phone: '' };
const RECONCILE_FORM_DEFAULT = { sold_qty: 0, returned_qty: 0, collected_amount: '' };

export function useAllocation() {
  const qc = useQueryClient();

  // Modal open states
  const [showAllocate,   setShowAllocate]   = useState(false);
  const [showAddSalesman,setShowAddSalesman] = useState(false);
  const [showEditSalesman,setShowEditSalesman] = useState(false);
  const [showReconcile,  setShowReconcile]  = useState(false);

  // Currently selected items
  const [selectedSalesman,   setSelectedSalesman]   = useState(null);
  const [selectedAllocation, setSelectedAllocation] = useState(null);

  // Form states
  const [allocForm,    setAllocForm]    = useState(ALLOC_FORM_DEFAULT);
  const [salesmanForm, setSalesmanForm] = useState(SALESMAN_FORM_DEFAULT);
  const [reconcileForm,setReconcileForm]= useState(RECONCILE_FORM_DEFAULT);

  // ---- Queries ----
  const { data: salesmen, isLoading } = useQuery({
    queryKey: ['salesmen'],
    queryFn:  salesmanService.getAll,
    refetchInterval: 30_000,
  });

  const { data: cylinders } = useQuery({
    queryKey: ['cylinders'],
    queryFn:  cylinderService.getAll,
  });

  // ---- Mutations ----
  const allocateMutation = useMutation({
    mutationFn: ({ salesmanId, data }) => salesmanService.allocate(salesmanId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salesmen'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAllocate(false);
      setAllocForm(ALLOC_FORM_DEFAULT);
    },
  });

  const createSalesmanMutation = useMutation({
    mutationFn: salesmanService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salesmen'] });
      setShowAddSalesman(false);
      setSalesmanForm(SALESMAN_FORM_DEFAULT);
    },
  });

  const updateSalesmanMutation = useMutation({
    mutationFn: ({ id, data }) => salesmanService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salesmen'] });
      setShowEditSalesman(false);
      setSalesmanForm(SALESMAN_FORM_DEFAULT);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id) => salesmanService.toggleActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salesmen'] }),
  });

  const reconcileMutation = useMutation({
    mutationFn: ({ allocationId, data }) => salesmanService.reconcile(allocationId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salesmen'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowReconcile(false);
      setReconcileForm(RECONCILE_FORM_DEFAULT);
    },
  });

  // ---- Action helpers ----
  const openAllocate = (salesman) => {
    setSelectedSalesman(salesman);
    setAllocForm(ALLOC_FORM_DEFAULT);
    allocateMutation.reset();
    setShowAllocate(true);
  };

  const openEditSalesman = (salesman) => {
    setSelectedSalesman(salesman);
    setSalesmanForm({ name: salesman.name, email: salesman.email, phone: salesman.phone || '', password: '' });
    updateSalesmanMutation.reset();
    setShowEditSalesman(true);
  };

  const openReconcile = (salesman, allocation) => {
    setSelectedSalesman(salesman);
    setSelectedAllocation(allocation);
    setReconcileForm({
      sold_qty:         allocation.sold_qty     ?? 0,
      returned_qty:     allocation.returned_qty ?? 0,
      collected_amount: allocation.collected_amount ?? '',
    });
    reconcileMutation.reset();
    setShowReconcile(true);
  };

  return {
    // Data
    salesmen:   Array.isArray(salesmen) ? salesmen : [],
    cylinders:  Array.isArray(cylinders) ? cylinders : (cylinders?.data || []),
    isLoading,

    // Allocate
    showAllocate, setShowAllocate,
    allocForm,    setAllocForm,
    selectedSalesman, openAllocate,
    allocate:     allocateMutation.mutate,
    isAllocating: allocateMutation.isPending,
    allocateError:allocateMutation.error,

    // Add salesman
    showAddSalesman, setShowAddSalesman,
    salesmanForm, setSalesmanForm,
    createSalesman: createSalesmanMutation.mutate,
    isCreatingSalesman: createSalesmanMutation.isPending,
    createSalesmanError: createSalesmanMutation.error,

    // Edit salesman
    showEditSalesman, setShowEditSalesman,
    openEditSalesman,
    updateSalesman: updateSalesmanMutation.mutate,
    isUpdatingSalesman: updateSalesmanMutation.isPending,
    updateSalesmanError: updateSalesmanMutation.error,

    // Toggle active
    toggleActive: toggleActiveMutation.mutate,

    // Reconcile
    showReconcile, setShowReconcile,
    selectedAllocation,
    reconcileForm, setReconcileForm,
    openReconcile,
    reconcile:     reconcileMutation.mutate,
    isReconciling: reconcileMutation.isPending,
    reconcileError:reconcileMutation.error,
  };
}
