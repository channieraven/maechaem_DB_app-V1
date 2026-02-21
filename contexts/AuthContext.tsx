import React, { createContext, useContext, useState, useEffect } from 'react';

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
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: { fullname: string; email: string; password: string; confirm_password: string; position: string; organization: string }) => Promise<any>;
  logout: () => void;
  updateProfile: (data: { fullName: string; position: string; affiliation: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const APPS_SCRIPT_URL =
  import.meta.env.VITE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzZ0SkJ3W3tNyBCjIprVWSCkGfmAyrVoEoBM7G7HWruOLu0phcNY7uYw5MZM-yd33R3/exec';

const LS_KEY = 'maechaem_user';

async function postToAppsScript(payload: any) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkUser = async () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      setUser(raw ? JSON.parse(raw) : null);
    } catch (e) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await postToAppsScript({ action: 'login', username, password });
      if (result?.success && result.user) {
        setUser(result.user);
        localStorage.setItem(LS_KEY, JSON.stringify(result.user));
        return { success: true };
      }
      setUser(null);
      localStorage.removeItem(LS_KEY);
      return { success: false, message: result?.error || 'เข้าสู่ระบบไม่สำเร็จ' };
    } catch (e: any) {
      setUser(null);
      localStorage.removeItem(LS_KEY);
      return { success: false, message: e?.message || 'เข้าสู่ระบบไม่สำเร็จ' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { fullname: string; email: string; password: string; confirm_password: string; position: string; organization: string }) => {
    const username = data.email;
    const result = await postToAppsScript({
      action: 'register',
      username,
      email: data.email,
      password: data.password,
      fullName: data.fullname,
      position: data.position,
      affiliation: data.organization,
    });
    return result;
  };

  const updateProfile = async (data: { fullName: string; position: string; affiliation: string }) => {
    if (!user) throw new Error('Unauthorized');

    const result = await postToAppsScript({
      action: 'updateUser',
      username: (user as any).username || user.email,
      email: user.email,
      fullName: data.fullName,
      position: data.position,
      affiliation: data.affiliation,
    });

    if (!result?.success) throw new Error(result?.error || 'อัปเดตข้อมูลไม่สำเร็จ');

    const nextUser = { ...user, ...data };
    setUser(nextUser);
    localStorage.setItem(LS_KEY, JSON.stringify(nextUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(LS_KEY);
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
