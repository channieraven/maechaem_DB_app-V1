import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowLeft } from 'lucide-react';

interface LoginProps {
  onBack?: () => void;
  setShowRegister?: (show: boolean) => void;
}

export const Login: React.FC<LoginProps> = ({ onBack, setShowRegister }) => {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (!result.success) {
      setError(result.message || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-green-600" size={48} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 relative">
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>กลับหน้าหลัก</span>
        </button>
      )}
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">ระบบบันทึกข้อมูลรายแปลง</h1>
          <p className="text-sm font-medium text-gray-600">สำนักวิจัยและพัฒนาการป่าไม้</p>
          <p className="text-gray-500 text-sm">เข้าสู่ระบบเพื่อเข้าถึงฐานข้อมูล</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="อีเมลหรือชื่อผู้ใช้"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200"
            required
          />
          <input
            type="password"
            placeholder="รหัสผ่าน"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200"
            required
          />
          <button
            type="submit"
            className="w-full px-6 py-3 border border-gray-300 rounded-lg bg-green-600 text-white font-medium shadow-sm hover:bg-green-700 transition-colors duration-200"
          >
            เข้าสู่ระบบ
          </button>
        </form>
        {setShowRegister && (
          <button
            onClick={() => setShowRegister(true)}
            className="w-full mt-4 px-6 py-3 border border-green-600 rounded-lg bg-green-600 text-white font-medium shadow-sm hover:bg-green-700 transition-colors duration-200"
          >
            สมัครสมาชิก
          </button>
        )}
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        <p className="text-xs text-gray-400 mt-8">
          เฉพาะนักวิจัยที่ได้รับการยืนยันเท่านั้นที่สามารถเข้าถึงแอปพลิเคชันนี้ได้
          บัญชีใหม่ต้องได้รับการอนุมัติจากผู้ดูแลระบบ
        </p>
      </div>
    </div>
  );
};
