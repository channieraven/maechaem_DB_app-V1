import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiPost } from '../services/sheetsService';

interface User {
  email: string;
  username?: string;
  name: string;
  picture: string;
  role: 'pending' | 'researcher' | 'admin';
  fullName?: string;
  position?: string;
  affiliation?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: { fullname: string; email: string; password: string; confirm_password: string; position: string; organization: string }) => Promise<any>;
  logout: () => void;
  updateProfile: (data: { fullName: string; position: string; affiliation: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to parse stored user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = async (data: { fullName: string; position: string; affiliation: string }) => {
    try {
      const result = await apiPost({
        action: 'updateUser',
        username: user?.email || user?.name || '',
        fullName: data.fullName,
        position: data.position,
        affiliation: data.affiliation
      });
      if (!result.success) throw new Error(result.error || 'Failed to update profile');
      if (user) {
        const updated: User = {
          ...user,
          fullName: data.fullName,
          position: data.position,
          affiliation: data.affiliation
        };
        setUser(updated);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Update profile failed', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await apiPost({ action: 'login', username: email, password });
      if (result.success && result.user) {
        setUser(result.user);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
        setIsLoading(false);
        return { success: true };
      } else {
        setUser(null);
        setIsLoading(false);
        return { success: false, message: result.error || result.message || 'เข้าสู่ระบบไม่สำเร็จ' };
      }
    } catch (error: any) {
      setUser(null);
      setIsLoading(false);
      return { success: false, message: error.message || 'เกิดข้อผิดพลาด' };
    }
  };

  const register = async (data: { fullname: string; email: string; password: string; confirm_password: string; position: string; organization: string }) => {
    setIsLoading(true);
    try {
      const result = await apiPost({
        action: 'register',
        username: data.email,
        email: data.email,
        password: data.password,
        fullName: data.fullname,
        position: data.position,
        affiliation: data.organization
      });
      setIsLoading(false);
      return result;
    } catch (error: any) {
      setIsLoading(false);
      return { success: false, error: error.message || 'เกิดข้อผิดพลาด' };
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear user session', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateProfile, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
