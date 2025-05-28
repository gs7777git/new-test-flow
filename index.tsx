
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'; // Added Outlet

import { AuthProvider } from './contexts/AuthContext';
import { PageShell } from './components/PageShell';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
// Spinner import was present but not used in App, kept for potential future use or if other components rely on it being here.
// import { Spinner } from './components/common/Spinner'; 
import ErrorBoundary from './components/common/ErrorBoundary';

import { DashboardPage } from './pages/DashboardPage';
import { LeadsPage } from './pages/LeadsPage';
import { UsersPage } from './pages/UsersPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Role } from './types';

console.log('index.tsx: script starting');

// Define a layout component for authenticated routes
const AppLayout: React.FC = () => {
  // PageShell and ProtectedRoute might use useLocation internally, which is fine.
  return (
    <ProtectedRoute>
      <PageShell>
        <Outlet /> {/* Child routes will render here */}
      </PageShell>
    </ProtectedRoute>
  );
};

const App: React.FC = () => {
  // const location = useLocation(); // No longer directly needed in App component
  // console.log('index.tsx: App component rendering.'); // Simplified log
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Routes that use the AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route 
          path="/users" 
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <UsersPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
              <ReportsPage />
            </ProtectedRoute>
          } 
        />
        <Route path="/settings" element={<SettingsPage />} />
        {/* Catch-all for unmatched authenticated routes under AppLayout */}
        <Route path="*" element={<Navigate to="/" replace />} /> 
      </Route>
    </Routes>
  );
};

const container = document.getElementById('root');
if (container) {
  console.log('index.tsx: Root container (#root) found.');
  const root = createRoot(container);
  const appBasename = (window as any).APP_BASENAME || '/';
  console.log('index.tsx: appBasename from window:', appBasename);

  root.render(
    <React.StrictMode>
      <BrowserRouter basename={appBasename}>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </React.StrictMode>
  );
  console.log('index.tsx: React app rendered.');
} else {
  console.error('index.tsx: Failed to find the root element (#root). App cannot be rendered.');
}
