import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  email: string;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to fetch user', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const updateProfile = async (data: { fullName: string; position: string; affiliation: string }) => {
    try {
      // ใช้ proxy-server endpoint
      const payload = {
        ...data,
        username: user?.email || user?.name || '', // ใช้ email หรือ name เป็น username
      };
      const res = await fetch('http://localhost:3001/updateProfile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to update profile');
      if (user) {
        setUser({
          email: user.email,
          name: user.name,
          picture: user.picture,
          role: user.role,
          fullName: data.fullName,
          position: data.position,
          affiliation: data.affiliation
        });
      }
    } catch (error) {
      console.error('Update profile failed', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/login', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await res.json();
      if (res.ok && result.success && result.user) {
        setUser(result.user);
        setIsLoading(false);
        return { success: true };
      } else {
        setUser(null);
        setIsLoading(false);
        return { success: false, message: result.error || "เข้าสู่ระบบไม่สำเร็จ" };
      }
    } catch (error: any) {
      setUser(null);
      setIsLoading(false);
      return { success: false, message: error.message || "เกิดข้อผิดพลาด" };
    }
  };

  const register = async (data: { fullname: string; email: string; password: string; confirm_password: string; position: string; organization: string }) => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/register', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      setIsLoading(false);
      return result;
    } catch (error: any) {
      setIsLoading(false);
      return { success: false, error: error.message || "เกิดข้อผิดพลาด" };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Logout failed', error);
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
