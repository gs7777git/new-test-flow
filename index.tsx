
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link, Outlet, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PageShell } from './components/PageShell';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Spinner } from './components/common/Spinner'; 
import ErrorBoundary from './components/common/ErrorBoundary'; // Added import

import { DashboardPage } from './pages/DashboardPage';
import { LeadsPage } from './pages/LeadsPage';
import { UsersPage } from './pages/UsersPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Role } from './types';

console.log('index.tsx: script starting');

const App: React.FC = () => {
  const location = useLocation();
  // console.log('index.tsx: App component rendering. Current location from useLocation:', location.pathname, 'Search:', location.search); // Reduced verbosity
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route 
        path="/*"
        element={
          <ProtectedRoute>
            <PageShell>
              <Routes>
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
                <Route path="*" element={<Navigate to="/" replace />} /> {/* Catch-all for unmatched authenticated routes */}
              </Routes>
            </PageShell>
          </ProtectedRoute>
        }
      />
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