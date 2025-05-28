
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';
import { Spinner } from './Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading, hasRole } = useAuth();
  const location = useLocation();
  
  console.log(
    'ProtectedRoute: Rendering. Path:', location.pathname,
    'isLoading:', isLoading, 
    'User authenticated:', !!user, 
    'User role:', user?.role,
    'Allowed roles:', allowedRoles
  );

  if (isLoading) {
    console.log('ProtectedRoute: isLoading is true, rendering Spinner.');
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: User is not authenticated. Redirecting to /login. Current location:', location.pathname, 'State being passed:', { from: location });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    console.log('ProtectedRoute: User does not have required role. User role:', user.role, 'Allowed roles:', allowedRoles, 'Redirecting to / (dashboard).');
    // User is logged in but doesn't have the required role
    // Redirect to a "Forbidden" page or dashboard, or show a message
    // For simplicity, redirecting to dashboard
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute: User authenticated and has required role (if any). Rendering children for path:', location.pathname);
  return <>{children}</>;
};