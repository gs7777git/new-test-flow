
import { AuthenticatedUser, User, Role, Lead, LeadStatus } from '../types';

export interface UserCredentials {
  email: string;
  password?: string;
}

const API_BASE_URL = 'https://googlesheet-proxy.govindsaini355.workers.dev';
const SESSION_STORAGE_KEY = 'crmProUser';

// --- Helper ---
async function apiRequest<T_Response = any>(
  sheetIdentifier: string,
  method: 'GET' | 'POST',
  payload?: any
): Promise<T_Response> {
  const sheetName = sheetIdentifier.startsWith('/') ? sheetIdentifier.substring(1) : sheetIdentifier;
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

  console.log(`API Request: ${method} ${url}`, payload ? `Payload: ${JSON.stringify(payload).substring(0, 200)}${JSON.stringify(payload).length > 200 ? '...' : ''}` : '');
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

    // Ensure GET requests for Users and Leads that expect arrays always return arrays
    if (method === 'GET' && (sheetName === 'Users' || sheetName === 'Leads')) {
      if (!Array.isArray(responseData)) {
        // Log the actual type and a snippet of the raw response for better debugging
        console.warn(`API Warning: Response for ${method} ${url} was not an array. Received type: ${typeof responseData}. Raw response snippet: '${rawResponseText.substring(0,100)}'. Returning [].`, responseData);
        return [] as T_Response;
      }
    }
    return responseData as T_Response;

  } catch (e) {
    // Log the error and the raw response text if available
    console.error(`API Exception during request to ${method} ${url}. Error: ${(e as Error).message}. Raw response text (if available): '${rawResponseText.substring(0, 200)}...'`, e);
    // If an array was expected (for Users or Leads GET requests), return an empty array to prevent downstream errors
    if (method === 'GET' && (sheetName === 'Users' || sheetName === 'Leads')) {
        console.warn(`API Critical Failure: Error during ${method} ${url}, expected array. Returning [].`);
        return [] as T_Response;
    }
    throw e; // Re-throw other errors
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

    const url = `${API_BASE_URL}?sheet=Users&login=true&email=${encodeURIComponent(processedCredentials.email)}&password=${encodeURIComponent(processedCredentials.password)}`;

    try {
      const response = await fetch(url, {
        method: 'GET', // Ensure this is GET as per the URL structure
        headers: {
          'Content-Type': 'application/json', // Though GET typically doesn't need Content-Type for body
        },
      });

      const rawResponseText = await response.text(); // Get raw text for better error diagnosis

      if (!response.ok) {
        console.error(`authService.login: API responded with status ${response.status} ${response.statusText}. Raw response: ${rawResponseText}`);
        throw new Error('Invalid email or password.'); // User-friendly message
      }
      
      const data = JSON.parse(rawResponseText); // Parse after checking response.ok
      console.log('authService.login: API response data:', data);

      if (data.success && data.user) {
        // Ensure the user object has the necessary fields for AuthenticatedUser
        const authenticatedUser: AuthenticatedUser = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role as Role, // Assuming role comes as a string matching Role enum
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authenticatedUser));
        console.log('authService.login: Login successful for user:', authenticatedUser.email);
        return authenticatedUser;
      } else {
        console.warn(`authService.login: Login failed. API indicated failure or missing user data. Message: ${data.message || 'No specific message'}`);
        throw new Error(data.message || 'Invalid email or password.'); // Use API message if available
      }
    } catch (error: any) {
      // Catch and log both network errors and errors thrown from response handling
      console.error('authService.login: Error during login attempt:', error.message, error);
      // If it's already an error with a user-friendly message, rethrow it, otherwise provide a generic one
      if (error.message === 'Invalid email or password.' || (error.message && (error.message.includes('API responded with status') || error.message.includes('Login failed')))) {
        throw error;
      }
      throw new Error('Login attempt failed. Please try again.'); // Generic message for other types of errors
    }
  },

  logout: async (): Promise<void> => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    console.log('authService.logout: Session cleared.');
    return Promise.resolve();
  },

  getCurrentUser: async (): Promise<AuthenticatedUser | null> => {
    const storedUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser) as AuthenticatedUser;
            // Basic validation of the stored user object
            if(user && user.id && user.email && user.role) {
              // console.log('authService.getCurrentUser: Found valid user in session:', user.email);
              return user;
            } else {
              console.warn('authService.getCurrentUser: Stored user object is invalid. Clearing session.');
              sessionStorage.removeItem(SESSION_STORAGE_KEY);
              return null;
            }
        } catch (error) {
            console.error('authService.getCurrentUser: Error parsing stored user. Clearing session.', error);
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            return null;
        }
    }
    // console.log('authService.getCurrentUser: No user in session.');
    return null;
  },
};

// --- User Service ---
export const userService = {
  getUsers: async (): Promise<User[]> => {
    const usersFromSheet = await apiRequest<User[]>('Users', 'GET'); // Removed leading slash
    // The apiRequest helper should now consistently return an array or throw.
    // No need to check for !Array.isArray(usersFromSheet) here if apiRequest handles it.
    return usersFromSheet.map(u => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = u; // Ensure password is not sent to client
      return userWithoutPassword;
    });
  },

  getUserById: async (userId: string): Promise<User | undefined> => {
    const users = await apiRequest<User[]>('Users', 'GET'); // Removed leading slash
    const user = users.find(u => u.id === userId);
    if (user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    return undefined;
  },

  // UserData for add should include passwordInput, not password directly.
  addUser: async (userData: Omit<User, 'id' | 'password'> & { passwordInput: string }): Promise<User> => {
    const { passwordInput, ...restUserData } = userData;
    // The backend proxy expects a 'password' field for new user creation from 'passwordInput'
    const newUserPayload: Omit<User, 'id'> = { ...restUserData, password: passwordInput };
    
    const response = await apiRequest<{ success: boolean; user: User; message?: string; id?: string; error?: string; }>('Users', 'POST', {
        action: 'add', // Assuming 'add' action for the proxy
        data: newUserPayload 
    });

    if (response.success && response.user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userToReturn } = response.user;
        return userToReturn;
    } else if (response.id && !response.user) { // Handle case where worker returns only ID
        // If only ID is returned, we might need to re-fetch or construct the user.
        // For simplicity, returning the input data with the new ID.
        // This depends on the exact proxy behavior.
        // It's better if the proxy returns the full created user object (without password).
        console.warn("User service addUser: Proxy returned ID but not full user object. Constructing from input.");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userToReturn } = { ...newUserPayload, id: response.id } as User;
        return userToReturn;
    }
     else {
        console.error('Failed to add user. API response:', response);
        throw new Error(response.message || response.error || 'Failed to add user due to an unknown error from API.');
    }
  },

  // UserData for update can optionally include passwordInput.
  updateUser: async (userId: string, userData: Partial<Omit<User, 'id' | 'email' | 'password'>> & { passwordInput?: string }): Promise<User> => {
    const { passwordInput, ...restUserData } = userData;
    const dataToUpdate: Partial<Omit<User, 'id' | 'email'>> = { ...restUserData };

    if (passwordInput) {
      (dataToUpdate as any).password = passwordInput; // Add password to data if provided
    }
    
    const response = await apiRequest<{ success: boolean; user: User; message?: string; error?: string; }>('Users', 'POST', { 
        action: 'update', 
        id: userId, 
        data: dataToUpdate 
    });

    if (response.success && response.user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userToReturn } = response.user;
        return userToReturn;
    } else {
        console.error('Failed to update user. API response:', response);
        throw new Error(response.message || response.error || 'Failed to update user due to an unknown error from API.');
    }
  },

  deleteUser: async (userId: string): Promise<void> => {
    const response = await apiRequest<{ success: boolean; message?: string; error?: string; }>('Users', 'POST', { action: 'delete', id: userId });
    if (!response.success) {
        console.error('Failed to delete user. API response:', response);
        throw new Error(response.message || response.error || 'Failed to delete user due to an unknown error from API.');
    }
  },
};

// --- Lead Service ---
export const leadService = {
  getLeads: async (): Promise<Lead[]> => {
    const leads = await apiRequest<Lead[]>('Leads', 'GET'); // Removed leading slash
    return leads;
  },

  addLead: async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedToName'>): Promise<Lead> => {
    const payload = {
        ...leadData,
        // Proxy worker should handle createdAt and updatedAt, and generate ID
    };
    const response = await apiRequest<{ success: boolean; lead: Lead; message?: string; error?: string; id?: string }>('Leads', 'POST', {
        action: 'add', // Assuming 'add' action for the proxy
        data: payload
    });

    if (response.success && response.lead) {
        return response.lead;
    } else if (response.id && !response.lead) { // If proxy returns ID only
        console.warn("Lead service addLead: Proxy returned ID but not full lead object. Constructing from input.");
        return { ...payload, id: response.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Lead; // Fallback
    }
    else {
        console.error('Failed to add lead. API response:', response);
        throw new Error(response.message || response.error || 'Failed to add lead due to an unknown error from API.');
    }
  },

  updateLead: async (leadId: string, leadData: Partial<Omit<Lead, 'id' | 'createdAt' | 'assignedToName'>>): Promise<Lead> => {
    const payload = {
        // Proxy worker should handle updatedAt
        ...leadData,
    };
    const response = await apiRequest<{ success: boolean; lead: Lead; message?: string; error?: string; }>('Leads', 'POST', { 
        action: 'update', 
        id: leadId, 
        data: payload 
    });
    if (response.success && response.lead) {
        return response.lead;
    } else {
        console.error('Failed to update lead. API response:', response);
        throw new Error(response.message || response.error || 'Failed to update lead due to an unknown error from API.');
    }
  },

  deleteLead: async (leadId: string): Promise<void> => {
    const response = await apiRequest<{ success: boolean; message?: string; error?: string; }>('Leads', 'POST', { action: 'delete', id: leadId });
    if (!response.success) {
        console.error('Failed to delete lead. API response:', response);
        throw new Error(response.message || response.error || 'Failed to delete lead due to an unknown error from API.');
    }
  },
};
