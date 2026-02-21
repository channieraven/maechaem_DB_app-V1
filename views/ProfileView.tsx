import React, { useEffect, useState } from 'react';

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
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    // TODO: เปลี่ยน email ให้เป็น email ของผู้ใช้ที่ login จริง
    fetch('http://localhost:3001/getUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mchayanuch@gmail.com' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setUser(data.user);
      });
  }, []);

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
