
import { Role, LeadStatus } from './types';

export const APP_NAME = "CRM Pro";

export const LEAD_STATUS_OPTIONS: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.CONVERTED,
  LeadStatus.LOST,
];

export const USER_ROLE_OPTIONS: Role[] = [
  Role.ADMIN,
  Role.MANAGER,
  Role.SALES_EXECUTIVE,
];

export const DEFAULT_FILTERS = {
  status: '',
  source: '',
  assignedTo: '',
};

export const MOCK_API_DELAY = 500; // ms
    