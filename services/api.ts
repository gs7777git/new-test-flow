
import { AuthenticatedUser, User, Role, Lead, LeadStatus } from '../types';

export interface UserCredentials {
  email: string;
  password?: string; 
}

const API_BASE_URL = 'https://googlesheet-proxy.govindsaini355.workers.dev';
const SESSION_STORAGE_KEY = 'crmProUser';

// --- Helper ---
// Interface ApiRequestOptions was removed as it wasn't directly used by the simplified apiRequest.
// The sheetName is now derived from the sheetIdentifier parameter.

async function apiRequest<T_Response = any>(
  sheetIdentifier: string, // e.g., "/Users" or "Users" or "Leads"
  method: 'GET' | 'POST',
  payload?: any 
): Promise<T_Response> {
  // Extract sheet name, removing leading slash if present
  const sheetName = sheetIdentifier.startsWith('/') ? sheetIdentifier.substring(1) : sheetIdentifier;
  
  // Construct URL with sheet name as a query parameter
  const url = `${API_BASE_URL}?sheet=${encodeURIComponent(sheetName)}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (method === 'POST' && payload) {
    options.body = JSON.stringify(payload);
  }

  console.log(`API Request: ${method} ${url}`, payload ? `Payload: ${JSON.stringify(payload).substring(0, 200)}${JSON.stringify(payload).length > 200 ? '...' : ''}` : ''); // Truncate long payloads in log
  let rawResponseText = '';

  try {
    const response = await fetch(url, options);
    rawResponseText = await response.text(); 

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText} for ${method} ${url}. Raw response: ${rawResponseText}`);
      throw new Error(`API request to sheet ${sheetName} failed: ${response.status} ${response.statusText} - ${rawResponseText}`);
    }

    if (response.status === 204 || !rawResponseText) { 
      if (method === 'GET' && (sheetName === 'Users' || sheetName === 'Leads')) {
        console.warn(`API Warning: Received ${response.status} No Content or empty response for ${method} ${url}, expected array. Returning [].`);
        return [] as T_Response;
      }
      return undefined as T_Response;
    }
    
    const responseData = JSON.parse(rawResponseText);
    // console.log(`API Response for ${method} ${url} (parsed):`, responseData); // Potentially verbose for large datasets

    if (method === 'GET' && (sheetName === 'Users' || sheetName === 'Leads')) {
      if (!Array.isArray(responseData)) {
        console.warn(`API Warning: Response for ${method} ${url} was not an array. Received:`, typeof responseData, `Returning []. Raw: ${rawResponseText.substring(0,100)}`);
        return [] as T_Response;
      }
    }
    return responseData as T_Response;

  } catch (e) {
    console.error(`API Exception during request to ${method} ${url}. Error: ${(e as Error).message}. Raw response text (if available): ${rawResponseText}`, e);
    if (method === 'GET' && (sheetName === 'Users' || sheetName === 'Leads')) {
        console.warn(`API Critical Failure: Error during ${method} ${url}, expected array. Returning [].`);
        return [] as T_Response;
    }
    throw e; 
  }
}


// --- Auth Service ---
export const authService = {
  login: async (credentials: UserCredentials): Promise<AuthenticatedUser> => {
    const processedCredentials = {
      email: credentials.email.trim(),
      password: credentials.password ? credentials.password.trim() : '' 
    };
    console.log('authService.login: Attempting with processed credentials:', {email: processedCredentials.email, password: processedCredentials.password ? '******' : 'N/A' });
    
    // Calls apiRequest with "/Users", which will be converted to sheetName="Users"
    const users = await apiRequest<User[]>('/Users', 'GET'); 
    
    // console.log('authService.login: Fetched users data type:', typeof users); // Less critical if array check is robust
    // console.log('authService.login: Is users an array?', Array.isArray(users)); // Redundant if type assertions are trusted or handled
    // console.log('authService.login: Fetched users content (first 5 for brevity):', JSON.stringify(users.slice(0,5), null, 2)); // Be careful with PII

    if (!Array.isArray(users)) { // This check is important due to potential API inconsistencies
        console.error('authService.login: CRITICAL - Fetched users is not an array. Cannot proceed. Users value:', users);
        throw new Error('Login failed: Could not retrieve user data correctly.');
    }

    const user = users.find(u => 
      u.email && u.email.toLowerCase() === processedCredentials.email.toLowerCase() && 
      u.password === processedCredentials.password
    );

    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...authenticatedUser } = user; 
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authenticatedUser));
      console.log('authService.login: Login successful for user ID:', authenticatedUser.id);
      return authenticatedUser;
    }
    console.warn('authService.login: Invalid email or password for email:', processedCredentials.email);
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
    // Ensure 'id' is not part of the payload for new user creation if backend autogenerates it.
    // The proxy script should handle ID generation if 'id' is not provided or is empty.
    const newUserPayload: Partial<User> = { ...restUserData, password: passwordInput };
    const addedUser = await apiRequest<User>('/Users', 'POST', newUserPayload);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userToReturn } = addedUser;
    return userToReturn;
  },
  updateUser: async (userId: string, userData: Partial<Omit<User, 'id' | 'email'>> & { passwordInput?: string }): Promise<User> => {
    const dataToUpdate: any = {};
    // Copy all properties from userData except passwordInput
    for (const key in userData) {
        if (key !== 'passwordInput' && Object.prototype.hasOwnProperty.call(userData, key)) {
            dataToUpdate[key] = (userData as any)[key];
        }
    }
    if (userData.passwordInput) {
      dataToUpdate.password = userData.passwordInput;
    }
    
    const payload = { action: 'update', id: userId, data: dataToUpdate };
    const updatedUserFromApi = await apiRequest<User>('/Users', 'POST', payload);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        // ID should ideally be generated by the backend/proxy if not provided
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(), 
    };
    return await apiRequest<Lead>('/Leads', 'POST', payload);
  },
  updateLead: async (leadId: string, leadData: Partial<Omit<Lead, 'id' | 'createdAt' | 'assignedToName'>>): Promise<Lead> => {
    // 'updatedAt' is always set. Other fields are partial.
    const payload = { 
        action: 'update', 
        id: leadId, 
        data: {
            ...leadData, // Spread the partial data first
            updatedAt: new Date().toISOString() // Then ensure updatedAt is set
        }
    };
    return await apiRequest<Lead>('/Leads', 'POST', payload);
  },
  deleteLead: async (leadId: string): Promise<void> => {
    await apiRequest('/Leads', 'POST', { action: 'delete', id: leadId });
  },
};
