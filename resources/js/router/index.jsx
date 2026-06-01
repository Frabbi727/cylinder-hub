import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Login from '../pages/auth/Login';
import AppShell from '../components/layout/AppShell';
import Dashboard from '../pages/Dashboard';
import Inventory from '../pages/Inventory';
import Purchases from '../pages/Purchases';
import Sales from '../pages/Sales';
import Allocation from '../pages/Allocation';
import Customers from '../pages/Customers';
import Suppliers from '../pages/Suppliers';
import Expenses from '../pages/Expenses';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/sales" replace />;
  return children;
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route index element={<AdminRoute><Dashboard /></AdminRoute>} />
                <Route path="inventory"  element={<AdminRoute><Inventory /></AdminRoute>} />
                <Route path="purchases"  element={<AdminRoute><Purchases /></AdminRoute>} />
                <Route path="sales"      element={<Sales />} />
                <Route path="allocation" element={<AdminRoute><Allocation /></AdminRoute>} />
                <Route path="customers"  element={<AdminRoute><Customers /></AdminRoute>} />
                <Route path="suppliers"  element={<AdminRoute><Suppliers /></AdminRoute>} />
                <Route path="expenses"   element={<AdminRoute><Expenses /></AdminRoute>} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
