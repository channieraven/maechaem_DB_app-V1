import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiGet } from '../services/sheetsService';

// กำหนด type ให้ตรงกับข้อมูลใน Google Sheets
type UserData = {
  id?: string;
  fullname?: string;
  email?: string;
  position?: string;
  organization?: string;
  role?: string;
  approved?: string;
  created_at?: string;
};

const ProfileView: React.FC = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    if (!authUser?.email) return;
    apiGet('users')
      .then((rows: UserData[]) => {
        const found = rows.find((r: UserData) => r.email === authUser.email);
        if (found) setUser(found);
      })
      .catch(err => console.error('Failed to load profile', err));
  }, [authUser?.email]);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h2>ข้อมูลผู้ใช้งาน</h2>
      <div>ชื่อ-นามสกุล: {user.fullname || '-'}</div>
      <div>ตำแหน่ง: {user.position || '-'}</div>
      <div>สังกัด: {user.organization || '-'}</div>
      <div>อีเมล: {user.email || '-'}</div>
      <div>วันที่สร้าง: {user.created_at ? new Date(user.created_at).toLocaleString('th-TH') : '-'}</div>
      <div>สถานะ: {user.approved === 'TRUE' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}</div>
    </div>
  );
};

export default ProfileView;
