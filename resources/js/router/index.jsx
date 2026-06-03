import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Login from '../pages/auth/Login';
import AppShell from '../components/layout/AppShell';

// Admin pages
import Dashboard     from '../pages/Dashboard';
import ExtraReturns  from '../pages/admin/ExtraReturns';
import Inventory    from '../pages/Inventory';
import Purchases    from '../pages/Purchases';
import Sales        from '../pages/Sales';
import NewSale      from '../pages/NewSale';
import Allocation   from '../pages/Allocation';
import Customers    from '../pages/Customers';
import Suppliers    from '../pages/Suppliers';
import Expenses     from '../pages/Expenses';

// Salesman pages
import SalesmanDashboard from '../pages/SalesmanDashboard';
import SaleDetail        from '../pages/SaleDetail';
import Dues              from '../pages/Dues';
import CustomerDetail    from '../pages/CustomerDetail';
import Empties           from '../pages/Empties';
import EndOfDay          from '../pages/EndOfDay';
import Reports           from '../pages/Reports';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user)                  return <Navigate to="/login" replace />;
  if (user.role !== 'admin')  return <Navigate to="/dashboard" replace />;
  return children;
}

function SalesmanRoute({ children }) {
  const { user } = useAuth();
  if (!user)                     return <Navigate to="/login" replace />;
  if (user.role !== 'salesman')  return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'salesman'
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/"          replace />;
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
                {/* Root redirect based on role */}
                <Route index element={<AdminRoute><Dashboard /></AdminRoute>} />

                {/* ── Admin routes ── */}
                <Route path="inventory"      element={<AdminRoute><Inventory /></AdminRoute>} />
                <Route path="purchases"      element={<AdminRoute><Purchases /></AdminRoute>} />
                <Route path="allocation"     element={<AdminRoute><Allocation /></AdminRoute>} />
                <Route path="suppliers"      element={<AdminRoute><Suppliers /></AdminRoute>} />
                <Route path="expenses"       element={<AdminRoute><Expenses /></AdminRoute>} />
                <Route path="extra-returns"  element={<AdminRoute><ExtraReturns /></AdminRoute>} />

                {/* ── Shared (admin + salesman) ── */}
                <Route path="sales"     element={<Sales />} />
                <Route path="sales/new" element={<NewSale />} />
                <Route path="sales/:id" element={<SaleDetail />} />
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerDetail />} />

                {/* ── Salesman-only routes ── */}
                <Route path="dashboard" element={<SalesmanRoute><SalesmanDashboard /></SalesmanRoute>} />
                <Route path="dues"      element={<SalesmanRoute><Dues /></SalesmanRoute>} />
                <Route path="empties"   element={<SalesmanRoute><Empties /></SalesmanRoute>} />
                <Route path="eod"       element={<SalesmanRoute><EndOfDay /></SalesmanRoute>} />
                <Route path="reports"   element={<SalesmanRoute><Reports /></SalesmanRoute>} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
