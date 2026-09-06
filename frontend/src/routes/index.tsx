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
