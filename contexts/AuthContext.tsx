
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { AuthenticatedUser, Role } from '../types';
import { authService, UserCredentials } from '../services/api'; 

interface AuthContextType {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (credentials: UserCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: Role | Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // console.log('AuthProvider: instance created. Initial isLoading:', isLoading, 'User:', user); // Too verbose for prod

  useEffect(() => {
    // console.log('AuthProvider: useEffect for initializing auth triggered.'); // Too verbose
    const initializeAuth = async () => {
      // console.log('AuthProvider: initializeAuth started.'); // Too verbose
      setIsLoading(true);
      try {
        const currentUser = await authService.getCurrentUser();
        // console.log('AuthProvider: getCurrentUser returned:', currentUser); // Too verbose
        setUser(currentUser);
      } catch (error) {
        console.error("AuthProvider: error initializing current user session", error);
        setUser(null);
      } finally {
        // console.log('AuthProvider: initializeAuth finished.'); // Too verbose
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = async (credentials: UserCredentials) => {
    console.log('AuthProvider: login attempt for email:', credentials.email);
    setIsLoading(true);
    try {
      const loggedInUser = await authService.login(credentials);
      console.log('AuthProvider: login successful for user ID:', loggedInUser.id);
      setUser(loggedInUser);
    } catch (error) {
      console.error('AuthProvider: login failed', error);
      setUser(null);
      throw error; 
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('AuthProvider: logout initiated for user ID:', user?.id);
    setIsLoading(true);
    try {
      await authService.logout();
      console.log('AuthProvider: logout successful.');
      setUser(null);
    } catch (error) {
      console.error("AuthProvider: Logout failed:", error);
      setUser(null); 
    } finally {
      setIsLoading(false);
    }
  };
  
  const hasRole = (roles: Role | Role[]): boolean => {
    if (!user) return false;
    const result = Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
    return result;
  };

  // console.log('AuthProvider: rendering provider with value: isLoading=', isLoading, 'user=', !!user); // Too verbose
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};