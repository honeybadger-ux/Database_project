import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SellerAuthProvider } from './context/SellerAuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Three Completely Separate Layouts (Zero Switcher Pills)
import TrackingLayout from './components/TrackingLayout';
import CourierErpLayout from './components/CourierErpLayout';
import SellerPortalLayout from './components/SellerPortalLayout';

// Public & Tracking Portal Pages (Port 5173)
import PublicTrackingPage from './pages/PublicTrackingPage';
import SuperAdminConsolePage from './pages/SuperAdminConsolePage';

// Carrier ERP Operational Pages (Port 5174)
import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ParcelListPage from './pages/ParcelListPage';
import RegisterParcelPage from './pages/RegisterParcelPage';
import ParcelDetailPage from './pages/ParcelDetailPage';
import ShipmentListPage from './pages/ShipmentListPage';
import CreateShipmentPage from './pages/CreateShipmentPage';
import AdminDashboard from './pages/AdminDashboard';
import HubManagementPage from './pages/HubManagementPage';
import EmployeeManagementPage from './pages/EmployeeManagementPage';
import AnalyticsPage from './pages/AnalyticsPage';

// E-Commerce Merchant Portal Pages (Port 5175)
import SellerPortalPage from './pages/SellerPortalPage';

export const App = () => {
  const currentPort = window.location.port;
  const location = useLocation();

  // Determine which isolated website to render based on Port or Path
  // Port 5175: Dedicated Merchant Aggregator SaaS
  // Port 5174: Dedicated Carrier Partner ERP & Logistics
  // Port 5173: Unified Public Customer Tracking & Super Root Admin Console
  const isSellerPortal =
    currentPort === '5175' ||
    (currentPort !== '5173' && currentPort !== '5174' && location.pathname.startsWith('/seller'));

  const isCarrierErp =
    currentPort === '5174' ||
    (currentPort !== '5173' &&
      currentPort !== '5175' &&
      ['/dashboard', '/parcels', '/shipments', '/admin', '/login'].some((prefix) =>
        location.pathname.startsWith(prefix)
      ));

  // ─────────────────────────────────────────────────────────────────────────────
  // WEBSITE 1: E-COMMERCE SELLER / AGGREGATOR PORTAL (PORT 5175)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isSellerPortal) {
    return (
      <SellerAuthProvider>
        <SellerPortalLayout>
          <Routes>
            <Route path="/" element={<SellerPortalPage />} />
            <Route path="/seller" element={<SellerPortalPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SellerPortalLayout>
      </SellerAuthProvider>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WEBSITE 2: COURIER PARTNER ERP & STAFF OPERATIONS PORTAL (PORT 5174)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isCarrierErp) {
    return (
      <AuthProvider>
        <CourierErpLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated Staff Operational Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parcels"
              element={
                <ProtectedRoute>
                  <ParcelListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parcels/register"
              element={
                <ProtectedRoute roles={['SUPER_ADMIN', 'COURIER_ADMIN', 'HUB_MANAGER', 'CLERK']}>
                  <RegisterParcelPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parcels/:id"
              element={
                <ProtectedRoute>
                  <ParcelDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shipments"
              element={
                <ProtectedRoute>
                  <ShipmentListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shipments/create"
              element={
                <ProtectedRoute roles={['SUPER_ADMIN', 'COURIER_ADMIN', 'HUB_MANAGER', 'CLERK']}>
                  <CreateShipmentPage />
                </ProtectedRoute>
              }
            />

            {/* Carrier Admin & Hub Operations Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['SUPER_ADMIN', 'COURIER_ADMIN', 'HUB_MANAGER']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/hubs"
              element={
                <ProtectedRoute roles={['SUPER_ADMIN', 'COURIER_ADMIN', 'HUB_MANAGER']}>
                  <HubManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/employees"
              element={
                <ProtectedRoute roles={['SUPER_ADMIN', 'COURIER_ADMIN', 'HUB_MANAGER']}>
                  <EmployeeManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute roles={['SUPER_ADMIN', 'COURIER_ADMIN', 'HUB_MANAGER']}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </CourierErpLayout>
      </AuthProvider>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WEBSITE 3: PUBLIC TRACKING & PLATFORM RESOLUTION PORTAL (PORT 5173 - DEFAULT)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <AuthProvider>
      <TrackingLayout>
        <Routes>
          <Route path="/" element={<PublicTrackingPage />} />
          <Route path="/tracking" element={<PublicTrackingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Super Platform Owner Console */}
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute roles={['SUPER_ADMIN']}>
                <SuperAdminConsolePage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TrackingLayout>
    </AuthProvider>
  );
};

export default App;
