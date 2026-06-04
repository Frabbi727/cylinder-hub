import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesmanService } from '../services/salesmanService';
import { cylinderService } from '../services/cylinderService';
import { useState } from 'react';

const todayStr = new Date().toISOString().split('T')[0];

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

const ALLOC_FORM_DEFAULT   = { cylinder_id: '', qty: 1, sale_price: '' };
const SALESMAN_FORM_DEFAULT = { name: '', email: '', password: '', phone: '' };
const RECONCILE_FORM_DEFAULT = { sold_qty: 0, returned_qty: 0, collected_amount: '' };

export function useAllocation() {
  const qc = useQueryClient();

  const [viewDate, setViewDate] = useState(todayStr);
  const isToday = viewDate === todayStr;

  const prevDay = () => setViewDate(d => addDays(d, -1));
  const nextDay = () => !isToday && setViewDate(d => addDays(d, 1));

  const [showAllocate,    setShowAllocate]    = useState(false);
  const [showAddSalesman, setShowAddSalesman] = useState(false);
  const [showEditSalesman,setShowEditSalesman]= useState(false);
  const [showReconcile,   setShowReconcile]   = useState(false);
  const [isEditMode,      setIsEditMode]      = useState(false);

  const [selectedSalesman,   setSelectedSalesman]   = useState(null);
  const [selectedAllocation, setSelectedAllocation] = useState(null);

  const [allocForm,     setAllocForm]     = useState(ALLOC_FORM_DEFAULT);
  const [salesmanForm,  setSalesmanForm]  = useState(SALESMAN_FORM_DEFAULT);
  const [reconcileForm, setReconcileForm] = useState(RECONCILE_FORM_DEFAULT);

  const { data: salesmenData, isLoading } = useQuery({
    queryKey: ['salesmen', viewDate],
    queryFn:  () => salesmanService.getAll(viewDate),
    refetchInterval: 30_000,
  });

  const { data: cylinders } = useQuery({
    queryKey: ['cylinders'],
    queryFn:  cylinderService.getAll,
  });

  const allocateMutation = useMutation({
    mutationFn: ({ salesmanId, data }) => salesmanService.allocate(salesmanId, {
      cylinder_id: parseInt(data.cylinder_id),
      qty:         parseInt(data.qty),
      sale_price:  parseFloat(data.sale_price || 0),
    }),
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

  const updateReconcileMutation = useMutation({
    mutationFn: ({ allocationId, data }) => salesmanService.updateReconcile(allocationId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salesmen'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowReconcile(false);
      setReconcileForm(RECONCILE_FORM_DEFAULT);
      setIsEditMode(false);
    },
  });

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
    setIsEditMode(false);
    setReconcileForm({
      sold_qty:         allocation.sold_qty     ?? 0,
      returned_qty:     allocation.returned_qty ?? 0,
      collected_amount: allocation.collected_amount ?? '',
    });
    reconcileMutation.reset();
    setShowReconcile(true);
  };

  const openEditReconcile = (salesman, allocation) => {
    setSelectedSalesman(salesman);
    setSelectedAllocation(allocation);
    setIsEditMode(true);
    setReconcileForm({
      sold_qty:         allocation.sold_qty         ?? 0,
      returned_qty:     allocation.returned_qty     ?? 0,
      collected_amount: allocation.collected_amount ?? '',
    });
    updateReconcileMutation.reset();
    setShowReconcile(true);
  };

  // salesmenData = full response: { success, data: [...salesmen], summary: {...}, message }
  const salesmenList = salesmenData?.data    || [];
  const allocSummary = salesmenData?.summary || {};

  return {
    salesmen:          salesmenList,
    allocationSummary: allocSummary,
    cylinders:  Array.isArray(cylinders) ? cylinders : (cylinders?.data || []),
    isLoading,
    viewDate, setViewDate, isToday, prevDay, nextDay,
    showAllocate, setShowAllocate,
    allocForm,    setAllocForm,
    selectedSalesman, openAllocate,
    allocate:     allocateMutation.mutate,
    isAllocating: allocateMutation.isPending,
    allocateError:allocateMutation.error,
    showAddSalesman, setShowAddSalesman,
    salesmanForm, setSalesmanForm,
    createSalesman: createSalesmanMutation.mutate,
    isCreatingSalesman: createSalesmanMutation.isPending,
    createSalesmanError: createSalesmanMutation.error,
    showEditSalesman, setShowEditSalesman,
    openEditSalesman,
    updateSalesman: updateSalesmanMutation.mutate,
    isUpdatingSalesman: updateSalesmanMutation.isPending,
    updateSalesmanError: updateSalesmanMutation.error,
    toggleActive: toggleActiveMutation.mutate,
    showReconcile, setShowReconcile,
    isEditMode,
    selectedAllocation,
    reconcileForm, setReconcileForm,
    openReconcile,
    openEditReconcile,
    reconcile:            reconcileMutation.mutate,
    isReconciling:        reconcileMutation.isPending,
    reconcileError:       reconcileMutation.error,
    updateReconcile:      updateReconcileMutation.mutate,
    isUpdatingReconcile:  updateReconcileMutation.isPending,
    updateReconcileError: updateReconcileMutation.error,
  };
}
