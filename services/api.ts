
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
      // Add any other common headers, e.g., Authorization if needed in future
    },
  };

  if (method === 'POST' && payload) {
    options.body = JSON.stringify(payload);
  }

  console.log(`API Request: ${method} ${url}`, payload ? `Payload: ${JSON.stringify(payload)}` : '');

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error: ${response.status} ${response.statusText} for ${method} ${url}`, errorText);
    throw new Error(`API request to ${endpoint} failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  if (response.status === 204) { // No Content
    return undefined as T_Response;
  }
  
  try {
    const responseData = await response.json();
    console.log(`API Response for ${method} ${url}:`, responseData);
    // The worker might return an array of objects, or a single object for add/update.
    // For Google Sheets, GET usually returns an array of rows (objects).
    // POST (add) might return the new row object or {success: true, id: newId}.
    // POST (update/delete) might return {success: true} or the updated row.
    // This needs to be aligned with the actual worker's response structure.
    // For now, we assume it returns what's expected (e.g., array for GET, object for single add/update).
    return responseData as T_Response;
  } catch (e) {
    const textResponse = await response.text(); // Check if it was non-JSON
     console.error(`API response for ${method} ${url} was not valid JSON. Text response: ${textResponse}`, e);
    // If it's a successful POST but no JSON body, we might resolve if appropriate
    if (method === 'POST' && response.ok && !textResponse) {
        return { success: true } as T_Response; // Or specific success object
    }
    throw new Error(`API response for ${endpoint} was not valid JSON: ${textResponse || 'Empty response'}`);
  }
}


// --- Auth Service ---
export const authService = {
  login: async (credentials: UserCredentials): Promise<AuthenticatedUser> => {
    // "Login: GET request via Worker to Users sheet"
    // This implies fetching all users and checking credentials client-side.
    // This is NOT secure for passwords in a real app but implementing as per spec.
    const users = await apiRequest<User[]>('/Users', 'GET');
    const user = users.find(u => u.email === credentials.email && u.password === credentials.password);

    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...authenticatedUser } = user; // Don't store password in session
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authenticatedUser));
      return authenticatedUser;
    }
    throw new Error('Invalid email or password.');
  },
  logout: async (): Promise<void> => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    // No API call for logout in this simple Google Sheets model
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
    // The Google Sheet might return passwords. We should strip them.
    const usersFromSheet = await apiRequest<User[]>('/Users', 'GET');
    return usersFromSheet.map(u => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });
  },
  getUserById: async (userId: string): Promise<User | undefined> => {
    // GET all users and filter. Inefficient but common for simple sheet APIs.
    const users = await apiRequest<User[]>('/Users', 'GET');
    const user = users.find(u => u.id === userId);
    if (user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    return undefined;
  },
  // For addUser, updateUser, deleteUser, we assume the worker API expects a POST
  // request where the body might contain an 'action' field or is inferred.
  // The prompt "Submit Lead POST request via Worker to append in Leads" suggests simple append.
  // We'll assume a similar pattern for users, or use an 'action' field for update/delete.

  addUser: async (userData: Omit<User, 'id'> & { passwordInput: string }): Promise<User> => {
    const { passwordInput, ...restUserData } = userData;
    const newUserPayload: Partial<User> = { ...restUserData, password: passwordInput };
    // Assuming POST to /Users appends and returns the created user with an ID from the sheet.
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
    // Assuming POST to /Users with action 'update' updates and returns the user.
    const updatedUserFromApi = await apiRequest<User>('/Users', 'POST', payload);
     // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userToReturn } = updatedUserFromApi;
    return userToReturn;
  },
  deleteUser: async (userId: string): Promise<void> => {
    // Assuming POST to /Users with action 'delete' deletes the user.
    // Response might be { success: true } or 204 No Content.
    await apiRequest('/Users', 'POST', { action: 'delete', id: userId });
    // If worker reassigns leads, that's its responsibility.
  },
};

// --- Lead Service ---
export const leadService = {
  getLeads: async (): Promise<Lead[]> => {
    // "Load Leads GET request via Worker to Leads sheet"
    // This will return leads. assignedToName needs to be populated client-side.
    return await apiRequest<Lead[]>('/Leads', 'GET');
  },
  // For addLead, the worker is expected to handle ID generation and timestamps.
  addLead: async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedToName'>): Promise<Lead> => {
    // "Submit Lead POST request via Worker to append in Leads"
    // assignedToName is not sent; it's derived.
    // createdAt and updatedAt should be handled by the worker or set here if worker expects them.
    // For simplicity, assume worker handles timestamps on append.
    const payload = {
        ...leadData,
        createdAt: new Date().toISOString(), // Send client time if worker doesn't set
        updatedAt: new Date().toISOString(), // Send client time if worker doesn't set
    };
    return await apiRequest<Lead>('/Leads', 'POST', payload);
  },
  updateLead: async (leadId: string, leadData: Partial<Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedToName'>>): Promise<Lead> => {
    const payload = { 
        action: 'update', 
        id: leadId, 
        data: {
            ...leadData,
            updatedAt: new Date().toISOString() // Send client time for update
        }
    };
    return await apiRequest<Lead>('/Leads', 'POST', payload);
  },
  deleteLead: async (leadId: string): Promise<void> => {
    await apiRequest('/Leads', 'POST', { action: 'delete', id: leadId });
  },
  // Lead History functions removed as they are not supported by simple Sheets backend
};
