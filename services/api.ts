
import { AuthenticatedUser, User, Role, Lead, LeadStatus } from '../types';

export interface UserCredentials {
  email: string;
  password?: string; 
}

const API_BASE_URL = 'https://googlesheet-proxy.govindsaini355.workers.dev';
const SESSION_STORAGE_KEY = 'crmProUser';

// --- Helper ---
interface ApiRequestOptions extends RequestInit {
  sheetName: string;
  action?: 'get' | 'add' | 'update' | 'delete'; // For more descriptive logging or payload structure if needed
  itemId?: string; // For update/delete
}

async function apiRequest<T_Response = any>(
  endpoint: string, // e.g., "/Users" or "/Leads"
  method: 'GET' | 'POST',
  payload?: any 
): Promise<T_Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (method === 'POST' && payload) {
    options.body = JSON.stringify(payload);
  }

  console.log(`API Request: ${method} ${url}`, payload ? `Payload: ${JSON.stringify(payload)}` : '');
  let rawResponseText = '';

  try {
    const response = await fetch(url, options);
    rawResponseText = await response.text(); // Get raw text first for better debugging

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText} for ${method} ${url}. Raw response: ${rawResponseText}`);
      throw new Error(`API request to ${endpoint} failed: ${response.status} ${response.statusText} - ${rawResponseText}`);
    }

    if (response.status === 204 || !rawResponseText) { // No Content or empty response
      // If an array is expected for GET /Users or GET /Leads, return empty array
      if (method === 'GET' && (endpoint === '/Users' || endpoint === '/Leads')) {
        console.warn(`API Warning: Received ${response.status} No Content or empty response for ${method} ${url}, expected array. Returning [].`);
        return [] as T_Response;
      }
      return undefined as T_Response;
    }
    
    const responseData = JSON.parse(rawResponseText);
    console.log(`API Response for ${method} ${url} (parsed):`, responseData);

    // Ensure GET /Users and GET /Leads return arrays
    if (method === 'GET' && (endpoint === '/Users' || endpoint === '/Leads')) {
      if (!Array.isArray(responseData)) {
        console.warn(`API Warning: Response for ${method} ${url} was not an array. Received:`, responseData, `Returning [].`);
        return [] as T_Response;
      }
    }
    return responseData as T_Response;

  } catch (e) {
    console.error(`API Exception during request to ${method} ${url}. Error: ${(e as Error).message}. Raw response text (if available): ${rawResponseText}`, e);
    // If an array is expected for GET /Users or GET /Leads, return empty array on critical failure
    if (method === 'GET' && (endpoint === '/Users' || endpoint === '/Leads')) {
        console.warn(`API Critical Failure: Error during ${method} ${url}, expected array. Returning [].`);
        return [] as T_Response;
    }
    throw e; // Re-throw other errors
  }
}


// --- Auth Service ---
export const authService = {
  login: async (credentials: UserCredentials): Promise<AuthenticatedUser> => {
    console.log('authService.login: Attempting to fetch users for email:', credentials.email);
    const users = await apiRequest<User[]>('/Users', 'GET');
    
    // Critical check: Log what 'users' is, especially in Netlify environment
    console.log('authService.login: Fetched users data type:', typeof users);
    console.log('authService.login: Is users an array?', Array.isArray(users));
    console.log('authService.login: Fetched users content:', JSON.stringify(users, null, 2));


    if (!Array.isArray(users)) {
        console.error('authService.login: CRITICAL - Fetched users is not an array. Cannot proceed with .find(). Users value:', users);
        throw new Error('Login failed: Could not retrieve user data correctly.');
    }

    const user = users.find(u => u.email === credentials.email && u.password === credentials.password);

    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...authenticatedUser } = user; 
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authenticatedUser));
      console.log('authService.login: Login successful for user ID:', authenticatedUser.id);
      return authenticatedUser;
    }
    console.warn('authService.login: Invalid email or password for email:', credentials.email);
    throw new Error('Invalid email or password.');
  },
  logout: async (): Promise<void> => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return Promise.resolve();
  },
  getCurrentUser: async (): Promise<AuthenticatedUser | null> => {
    const storedUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  },
};

// --- User Service ---
export const userService = {
  getUsers: async (): Promise<User[]> => {
    const usersFromSheet = await apiRequest<User[]>('/Users', 'GET');
    if (!Array.isArray(usersFromSheet)) {
        console.warn('userService.getUsers: API did not return an array. Returning []. Users value:', usersFromSheet);
        return [];
    }
    return usersFromSheet.map(u => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });
  },
  getUserById: async (userId: string): Promise<User | undefined> => {
    const users = await apiRequest<User[]>('/Users', 'GET');
     if (!Array.isArray(users)) {
        console.warn('userService.getUserById: API did not return an array for users. Returning undefined. Users value:', users);
        return undefined;
    }
    const user = users.find(u => u.id === userId);
    if (user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    return undefined;
  },
  addUser: async (userData: Omit<User, 'id'> & { passwordInput: string }): Promise<User> => {
    const { passwordInput, ...restUserData } = userData;
    const newUserPayload: Partial<User> = { ...restUserData, password: passwordInput };
    const addedUser = await apiRequest<User>('/Users', 'POST', newUserPayload);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userToReturn } = addedUser;
    return userToReturn;
  },
  updateUser: async (userId: string, userData: Partial<Omit<User, 'id' | 'email'>> & { passwordInput?: string }): Promise<User> => {
    const payload: any = { action: 'update', id: userId, data: {} };
    if (userData.passwordInput) {
      payload.data.password = userData.passwordInput;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordInput, ...rest } = userData;
      payload.data = {...payload.data, ...rest};
    } else {
      payload.data = userData;
    }
    const updatedUserFromApi = await apiRequest<User>('/Users', 'POST', payload);
    const { password, ...userToReturn } = updatedUserFromApi;
    return userToReturn;
  },
  deleteUser: async (userId: string): Promise<void> => {
    await apiRequest('/Users', 'POST', { action: 'delete', id: userId });
  },
};

// --- Lead Service ---
export const leadService = {
  getLeads: async (): Promise<Lead[]> => {
    const leads = await apiRequest<Lead[]>('/Leads', 'GET');
    if (!Array.isArray(leads)) {
        console.warn('leadService.getLeads: API did not return an array. Returning []. Leads value:', leads);
        return [];
    }
    return leads;
  },
  addLead: async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedToName'>): Promise<Lead> => {
    const payload = {
        ...leadData,
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(), 
    };
    return await apiRequest<Lead>('/Leads', 'POST', payload);
  },
  updateLead: async (leadId: string, leadData: Partial<Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedToName'>>): Promise<Lead> => {
    const payload = { 
        action: 'update', 
        id: leadId, 
        data: {
            ...leadData,
            updatedAt: new Date().toISOString() 
        }
    };
    return await apiRequest<Lead>('/Leads', 'POST', payload);
  },
  deleteLead: async (leadId: string): Promise<void> => {
    await apiRequest('/Leads', 'POST', { action: 'delete', id: leadId });
  },
};
