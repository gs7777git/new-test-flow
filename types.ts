
import React from 'react'; // Added to ensure React types are consistently sourced

export enum Role {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  SALES_EXECUTIVE = 'Sales Executive',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string; // For creation/storage and login check with Sheets
}

export interface AuthenticatedUser extends Omit<User, 'password'> {
  // any additional fields for authenticated user if needed
}

export enum LeadStatus {
  NEW = 'New',
  CONTACTED = 'Contacted',
  QUALIFIED = 'Qualified',
  CONVERTED = 'Converted',
  LOST = 'Lost',
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  assignedToId: string | null; // User ID
  assignedToName?: string; // For display convenience, populated client-side
  notes: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// LeadHistory interface removed

export interface NavigationItem {
  name: string;
  href: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  roles?: Role[]; // Roles that can see this item
  current?: boolean; // For active state styling
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface SalesReportData {
  totalLeads: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: number; // Percentage
  leadsByStatus: ChartDataPoint[];
  leadsBySource: ChartDataPoint[];
}
