import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-secondary-900">Dashboard</h1>
      <div className="mt-4 p-6 bg-white shadow rounded-lg">
        <h2 className="text-xl font-medium text-secondary-800">Welcome, {user?.name}!</h2>
        <p className="mt-2 text-secondary-600">
          This is your CRM dashboard. More KPIs and summaries will be displayed here soon.
        </p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Example KPI cards - replace with actual data later */}
          <div className="bg-primary-50 p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium text-primary-700">Total Leads</h3>
            <p className="text-3xl font-bold text-primary-900">125</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium text-green-700">Converted Leads</h3>
            <p className="text-3xl font-bold text-green-900">30</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium text-red-700">Conversion Rate</h3>
            <p className="text-3xl font-bold text-red-900">24%</p>
          </div>
        </div>
      </div>
    </div>
  );
};
