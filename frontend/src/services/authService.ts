import axiosInstance from '../api/axiosInstance';

export type UserRole = 'customer' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  role: UserRole;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const TOKEN_KEY = 'meruveda_auth_token';
const USER_KEY = 'meruveda_user';

export const authService = {
  login: async (email: string, password: string, rememberMe = false): Promise<AuthResponse> => {
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const { token, user } = response.data;

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, token);
      storage.setItem(USER_KEY, JSON.stringify(user));
      
      // Always keep in localStorage for consistency across tabs
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      if (typeof window !== 'undefined') {
        const maxAge = rememberMe ? 30 * 24 * 60 * 60 : ''; 
        document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax${maxAge ? `; max-age=${maxAge}` : ''}`;
      }

      return { user, token, role: user.role };
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  signup: async (data: SignupData): Promise<AuthResponse> => {
    try {
      const response = await axiosInstance.post('/auth/register', data);
      const { token, user } = response.data;

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      if (typeof window !== 'undefined') {
        document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax`;
      }

      return { user, token, role: user.role };
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  forgotPassword: async (email: string): Promise<void> => {
    try {
      await axiosInstance.post('/auth/forgot-password', { email });
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    try {
      await axiosInstance.post('/auth/reset-password', { token, newPassword });
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  getCurrentUser: (): AuthUser | null => {
    try {
      if (typeof window === 'undefined') return null;
      const token = localStorage.getItem(TOKEN_KEY);
      const userData = localStorage.getItem(USER_KEY);
      if (!token || !userData) return null;
      return JSON.parse(userData) as AuthUser;
    } catch {
      return null;
    }
  },

  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  logout: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
  },

  hasRole: (role: UserRole): boolean => {
    const user = authService.getCurrentUser();
    return user?.role === role;
  },
};
