import React, { useState } from 'react';
import { apiPost } from '../services/sheetsService';

export const Register: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [form, setForm] = useState({
    fullname: '',
    email: '',
    password: '',
    confirm_password: '',
    position: '',
    organization: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.fullname || !form.email || !form.password || !form.confirm_password || !form.position || !form.organization) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiPost({
        action: 'register',
        username: form.email,
        email: form.email,
        password: form.password,
        fullName: form.fullname,
        position: form.position,
        affiliation: form.organization
      });
      if (data.success) {
        setSuccess('สมัครสมาชิกสำเร็จ กรุณารอการอนุมัติ');
        setForm({ fullname: '', email: '', password: '', confirm_password: '', position: '', organization: '' });
      } else {
        setError(data.error || data.message || 'สมัครสมาชิกไม่สำเร็จ');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 relative">
      {onBack && (
        <button onClick={onBack} className="absolute top-6 left-6 text-gray-500 hover:text-gray-900">กลับหน้าหลัก</button>
      )}
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">สมัครสมาชิก</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="fullname" type="text" placeholder="ชื่อ-สกุล" value={form.fullname} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg" />
          <input name="email" type="email" placeholder="อีเมล" value={form.email} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg" />
          <input name="password" type="password" placeholder="รหัสผ่าน" value={form.password} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg" />
          <input name="confirm_password" type="password" placeholder="ยืนยันรหัสผ่าน" value={form.confirm_password} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg" />
          <input name="position" type="text" placeholder="ตำแหน่ง" value={form.position} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg" />
          <input name="organization" type="text" placeholder="สังกัด" value={form.organization} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg" />
          <button type="submit" className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium" disabled={isLoading}>สมัครสมาชิก</button>
        </form>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        {success && <div className="text-green-600 text-sm mt-2">{success}</div>}
      </div>
    </div>
  );
};
