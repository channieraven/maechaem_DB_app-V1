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

// Allow the API to live on a different origin (e.g. Cloud Run) when the
// frontend is served as a static site (e.g. GitHub Pages).
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try the server session first, fall back to localStorage
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.user) {
          setUser(data.user);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        } else {
          const stored = localStorage.getItem(USER_STORAGE_KEY);
          if (stored) setUser(JSON.parse(stored));
        }
      })
      .catch(() => {
        // Server not reachable (e.g. static deployment) — use localStorage
        try {
          const stored = localStorage.getItem(USER_STORAGE_KEY);
          if (stored) setUser(JSON.parse(stored));
        } catch (err) {
          console.error('Failed to parse stored user data:', err);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateProfile = async (data: { fullName: string; position: string; affiliation: string }) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      let result: any;
      try {
        result = await res.json();
      } catch {
        throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
      }
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
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      let result: any;
      try {
        result = await res.json();
      } catch {
        setUser(null);
        setIsLoading(false);
        return { success: false, message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง' };
      }
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
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullname: data.fullname,
          email: data.email,
          password: data.password,
          position: data.position,
          organization: data.organization,
        }),
      });
      let result: any;
      try {
        result = await res.json();
      } catch {
        setIsLoading(false);
        return { success: false, error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง' };
      }
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
    fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch((err) => {
      console.error('Server-side logout failed:', err);
    });
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
