
import React, { useState, Fragment } from 'react';
import { Link, useLocation, useNavigate }  from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthenticatedUser, NavigationItem, Role } from '../types';
import { APP_NAME } from '../constants';
import { DashboardIcon, LeadsIcon, UsersIcon, ReportsIcon, SettingsIcon, LogoutIcon, XMarkIcon } from './common/Icons';
import { Button } from './common/Button';

const initialNavigation: Omit<NavigationItem, 'current'>[] = [
  { name: 'Dashboard', href: '/', icon: DashboardIcon, roles: [Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE] },
  { name: 'Leads', href: '/leads', icon: LeadsIcon, roles: [Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE] },
  { name: 'Users', href: '/users', icon: UsersIcon, roles: [Role.ADMIN] },
  { name: 'Reports', href: '/reports', icon: ReportsIcon, roles: [Role.ADMIN, Role.MANAGER] },
  { name: 'Settings', href: '/settings', icon: SettingsIcon, roles: [Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE] },
];

const UserNavigation = ({ user, onLogout }: { user: AuthenticatedUser, onLogout: () => void }) => (
  <div className="mt-3 space-y-1 px-2">
    <button
      onClick={onLogout}
      className="group flex w-full items-center rounded-md px-2 py-2 text-base font-medium text-secondary-600 hover:bg-secondary-200 hover:text-secondary-900"
    >
      <LogoutIcon className="mr-4 h-6 w-6 flex-shrink-0 text-secondary-400 group-hover:text-secondary-500" aria-hidden="true" />
      Logout
    </button>
  </div>
);


export const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = initialNavigation
    .filter(item => !item.roles || hasRole(item.roles))
    .map(item => ({ ...item, current: location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href)) }));

  const SidebarContent = () => (
    <>
      <div className="flex flex-shrink-0 items-center px-4 h-16 bg-primary-700">
         <img
            className="h-8 w-auto"
            src="https://tailwindui.com/img/logos/mark.svg?color=white"
            alt={APP_NAME} // Updated alt text
          />
        <span className="ml-3 text-xl font-semibold text-white">{APP_NAME}</span>
      </div>
      <div className="mt-5 flex flex-grow flex-col">
        <nav className="flex-1 space-y-1 px-2 pb-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`
                ${item.current ? 'bg-primary-800 text-white' : 'text-primary-100 hover:bg-primary-600 hover:text-white'}
                group flex items-center px-2 py-2 text-sm font-medium rounded-md
              `}
              aria-current={item.current ? 'page' : undefined}
            >
              <item.icon
                className={`
                  ${item.current ? 'text-white' : 'text-primary-300 group-hover:text-primary-100'}
                  mr-3 flex-shrink-0 h-6 w-6
                `}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
       {user && (
        <div className="flex flex-shrink-0 border-t border-primary-600 p-4">
            <div className="flex-shrink-0 group block">
                <div className="flex items-center">
                <div>
                    <img
                    className="inline-block h-9 w-9 rounded-full"
                    src={`https://picsum.photos/seed/${user.email}/100/100`} 
                    alt="" // Decorative, user name is adjacent
                    />
                </div>
                <div className="ml-3">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs font-medium text-primary-200 group-hover:text-white">{user.role}</p>
                </div>
                </div>
            </div>
        </div>
       )}
       <div className="border-t border-primary-600">
         {user && <UserNavigation user={user} onLogout={handleLogout} />}
       </div>
    </>
  );


  return (
    <div>
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-secondary-600 bg-opacity-75" aria-hidden="true" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-primary-700 pt-5 pb-4">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <SidebarContent />
          </div>
          <div className="w-14 flex-shrink-0" aria-hidden="true" /> {/* Dummy element to force sidebar to shrink to fit close icon */}
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-primary-700">
         <SidebarContent />
        </div>
      </div>

      <div className="flex flex-col md:pl-64">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow">
          <button
            type="button"
            className="border-r border-secondary-200 px-4 text-secondary-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-controls="mobile-sidebar" // Assuming mobile sidebar div would have this ID if needed
            aria-expanded={sidebarOpen}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1">
              {/* Search bar can go here if needed */}
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              {/* Profile dropdown or other header items */}
              {user && (
                 <Button variant="outline" onClick={handleLogout} size="sm" leftIcon={<LogoutIcon className="h-5 w-5"/>}>
                    Logout
                 </Button>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};