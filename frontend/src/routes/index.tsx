import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '@/layouts/RootLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import {
  InventoryListPage,
  InventoryCreatePage,
  InventoryDetailPage,
  InventoryEditPage,
} from '@/pages/inventory';
import {
  SupplierListPage,
  SupplierCreatePage,
  SupplierDetailPage,
  SupplierEditPage,
} from '@/pages/suppliers';
import {
  PurchaseListPage,
  PurchaseCreatePage,
  PurchaseDetailPage,
} from '@/pages/purchases';
import {
  InvoiceListPage,
  InvoiceUploadPage,
  InvoiceDetailPage,
} from '@/pages/invoices';
import {
  ProductionListPage,
  ProductionCreatePage,
  ProductionDetailPage,
} from '@/pages/production';
import {
  SaleListPage,
  SaleCreatePage,
  SaleDetailPage,
} from '@/pages/sales';
import { SimulatorPage } from '@/pages/SimulatorPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { UsersPage } from '@/pages/UsersPage';

export const router = createBrowserRouter([
  // ----------------------------------------------------------------
  // Public routes — accessible without authentication
  // ----------------------------------------------------------------
  {
    path: '/login',
    element: <LoginPage />,
  },

  // ----------------------------------------------------------------
  // Protected routes — require authentication
  // ----------------------------------------------------------------
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <RootLayout />,
        children: [
          // Redirect root to dashboard
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          // Inventory management routes (M7)
          {
            path: 'inventory',
            element: <InventoryListPage />,
          },
          {
            path: 'inventory/new',
            element: <InventoryCreatePage />,
          },
          {
            path: 'inventory/:id',
            element: <InventoryDetailPage />,
          },
          {
            path: 'inventory/:id/edit',
            element: <InventoryEditPage />,
          },
          // Supplier management routes
          {
            path: 'suppliers',
            element: <SupplierListPage />,
          },
          {
            path: 'suppliers/new',
            element: <SupplierCreatePage />,
          },
          {
            path: 'suppliers/:id',
            element: <SupplierDetailPage />,
          },
          {
            path: 'suppliers/:id/edit',
            element: <SupplierEditPage />,
          },
          // Purchase management routes
          {
            path: 'purchases',
            element: <PurchaseListPage />,
          },
          {
            path: 'purchases/new',
            element: <PurchaseCreatePage />,
          },
          {
            path: 'purchases/:id',
            element: <PurchaseDetailPage />,
          },
          // Invoice management routes
          {
            path: 'invoices',
            element: <InvoiceListPage />,
          },
          {
            path: 'invoices/new',
            element: <InvoiceUploadPage />,
          },
          {
            path: 'invoices/:id',
            element: <InvoiceDetailPage />,
          },
          // Production management routes (M12-M13)
          {
            path: 'production',
            element: <ProductionListPage />,
          },
          {
            path: 'production/new',
            element: <ProductionCreatePage />,
          },
          {
            path: 'production/:id',
            element: <ProductionDetailPage />,
          },
          // Sales management routes (M14-M15)
          {
            path: 'sales',
            element: <SaleListPage />,
          },
          {
            path: 'sales/new',
            element: <SaleCreatePage />,
          },
          {
            path: 'sales/:id',
            element: <SaleDetailPage />,
          },
          // What-If Simulator & Operational Intelligence (M20-M21)
          {
            path: 'simulator',
            element: <SimulatorPage />,
          },
          // Reports & Analytics (M16-M17)
          {
            path: 'reports',
            element: <ReportsPage />,
          },
          // User Management (Admin Only)
          {
            path: 'users',
            element: <UsersPage />,
          },
          // Catch-all within authenticated shell
          {
            path: '*',
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
]);
