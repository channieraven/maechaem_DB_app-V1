import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  email: string;
  username?: string;
  name: string;
  picture: string;
  role: 'pending' | 'researcher' | 'admin' | 'staff' | 'executive' | 'external';
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

// Use GAS as the sole backend — no cookie/session, no /api/auth/* endpoints.
const APPS_SCRIPT_URL =
  (import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://script.google.com/macros/s/AKfycbwUTwY4vWU1jWhtX2fWAazBYZTSG_I4eKbOKlmw-cGlUo7o4tp1Y_Ue3cWJ2XkY-Wkk/exec';

// Post a JSON payload to GAS using text/plain to avoid CORS preflight.
async function gasPost(payload: object): Promise<any> {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // GAS has no server-side session — restore user from localStorage only.
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch (err) {
      console.error('Failed to parse stored user data:', err);
    }
    setIsLoading(false);
  }, []);

  const updateProfile = async (data: { fullName: string; position: string; affiliation: string }) => {
    if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
    try {
      const result = await gasPost({ action: 'updateUser', email: user.email, ...data });
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
      const result = await gasPost({ action: 'login', email, password });
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
      return { success: false, message: error.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง' };
    }
  };

  const register = async (data: { fullname: string; email: string; password: string; confirm_password: string; position: string; organization: string }) => {
    setIsLoading(true);
    try {
      const result = await gasPost({
        action: 'register',
        fullname: data.fullname,
        email: data.email,
        password: data.password,
        position: data.position,
        organization: data.organization,
        role: 'pending',
      });
      setIsLoading(false);
      return result;
    } catch (error: any) {
      setIsLoading(false);
      return { success: false, error: error.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง' };
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
