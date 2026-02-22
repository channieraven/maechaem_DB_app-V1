import React, { useEffect, useState } from 'react';
import { User, Mail, Briefcase, Building2, Calendar, ShieldCheck, ShieldAlert, Loader2, Users, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost } from '../services/sheetsService';

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

/** Normalise apiGet response to a plain array regardless of response shape */
const extractRows = (res: any): UserData[] =>
  Array.isArray(res) ? res : (res?.data ?? []);

const ROLE_OPTIONS = [
  { value: 'pending',    label: 'รออนุมัติ' },
  { value: 'staff',      label: 'เจ้าหน้าที่' },
  { value: 'researcher', label: 'นักวิจัย' },
  { value: 'executive',  label: 'ผู้บริหาร' },
  { value: 'external',   label: 'บุคคลภายนอก' },
  { value: 'admin',      label: 'ผู้ดูแลระบบ' },
];

const roleBadge = (role?: string) => {
  switch (role) {
    case 'admin':      return { label: 'ผู้ดูแลระบบ',   color: 'bg-purple-100 text-purple-700' };
    case 'researcher': return { label: 'นักวิจัย',       color: 'bg-blue-100 text-blue-700' };
    case 'staff':      return { label: 'เจ้าหน้าที่',   color: 'bg-green-100 text-green-700' };
    case 'executive':  return { label: 'ผู้บริหาร',     color: 'bg-yellow-100 text-yellow-700' };
    case 'external':   return { label: 'บุคคลภายนอก',  color: 'bg-gray-100 text-gray-600' };
    default:           return { label: 'รออนุมัติ',     color: 'bg-orange-100 text-orange-600' };
  }
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
    <div className="mt-0.5 text-green-600 shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-800 font-semibold mt-0.5 break-words">{value || '-'}</p>
    </div>
  </div>
);

// ---- My Profile Tab ----
const MyProfileTab: React.FC<{ authUser: any }> = ({ authUser }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser?.email) { setIsLoading(false); return; }
    setIsLoading(true);
    apiGet('users')
      .then((res: any) => {
        const rows = extractRows(res);
        const found = rows.find((r) => r.email === authUser.email);
        setUserData(found ?? {
          email: authUser.email,
          fullname: authUser.fullName || authUser.name,
          position: authUser.position,
          organization: authUser.affiliation,
          role: authUser.role,
        });
      })
      .catch(() => {
        setError('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
        setUserData({
          email: authUser.email,
          fullname: authUser.fullName || authUser.name,
          position: authUser.position,
          organization: authUser.affiliation,
          role: authUser.role,
        });
      })
      .finally(() => setIsLoading(false));
  }, [authUser?.email]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-green-600">
        <Loader2 size={36} className="animate-spin" />
        <span className="text-sm text-gray-500">กำลังโหลดข้อมูลโปรไฟล์...</span>
      </div>
    );
  }

  const badge = roleBadge(userData?.role);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs rounded-lg px-3 py-2">
          {error} — แสดงข้อมูลจากเซสชั่นปัจจุบัน
        </div>
      )}

      {/* Avatar & Name card */}
      <div className="bg-gradient-to-br from-[#2d5a27] to-[#3d7a35] rounded-2xl p-6 text-white shadow-lg flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center shrink-0">
          {authUser?.picture ? (
            <img src={authUser.picture} alt={authUser.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <User size={32} className="text-white/90" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold truncate">{userData?.fullname || authUser?.fullName || authUser?.name || '-'}</p>
          <p className="text-white/70 text-sm truncate">{userData?.email || authUser?.email}</p>
          <span className={`inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge.color}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-2">
        <InfoRow
          icon={<Briefcase size={16} />}
          label="ตำแหน่ง"
          value={userData?.position || authUser?.position}
        />
        <InfoRow
          icon={<Building2 size={16} />}
          label="สังกัด / หน่วยงาน"
          value={userData?.organization || authUser?.affiliation}
        />
        <InfoRow
          icon={<Mail size={16} />}
          label="อีเมล"
          value={userData?.email || authUser?.email}
        />
        <InfoRow
          icon={<Calendar size={16} />}
          label="วันที่ลงทะเบียน"
          value={
            userData?.created_at
              ? new Date(userData.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
              : '-'
          }
        />
        <InfoRow
          icon={userData?.approved === 'TRUE' ? <ShieldCheck size={16} className="text-green-500" /> : <ShieldAlert size={16} className="text-orange-400" />}
          label="สถานะบัญชี"
          value={
            <span className={userData?.approved === 'TRUE' ? 'text-green-600' : 'text-orange-500'}>
              {userData?.approved === 'TRUE' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
            </span>
          }
        />
      </div>
    </div>
  );
};

// ---- Admin: User Management Tab ----
const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadUsers = () => {
    setIsLoading(true);
    apiGet('users')
      .then((res: any) => {
        const rows = extractRows(res);
        setUsers(rows.filter((u) => !!u.email));
      })
      .catch(() => showToast('ไม่สามารถโหลดรายการผู้ใช้งานได้', false))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (email: string, newRole: string) => {
    setSavingEmail(email);
    try {
      const res = await apiPost({ action: 'updateUserRole', username: email, role: newRole }); // backend expects 'username' key for email
      if (res.success) {
        setUsers(prev => prev.map(u => u.email === email ? { ...u, role: newRole } : u));
        showToast('อัปเดต role เรียบร้อย', true);
      } else {
        showToast(res.error || 'อัปเดตไม่สำเร็จ', false);
      }
    } catch {
      showToast('เกิดข้อผิดพลาด', false);
    } finally {
      setSavingEmail(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-green-600">
        <Loader2 size={36} className="animate-spin" />
        <span className="text-sm text-gray-500">กำลังโหลดรายชื่อผู้ใช้งาน...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {toast && (
        <div className={`mb-4 text-sm rounded-lg px-4 py-2 font-medium ${toast.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <Users size={18} className="text-green-600" /> รายชื่อผู้ใช้งาน ({users.length} คน)
        </h3>
        <button onClick={loadUsers} className="text-xs text-green-600 hover:underline">รีเฟรช</button>
      </div>

      <div className="space-y-3">
        {users.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">ไม่พบข้อมูลผู้ใช้งาน</p>
        )}
        {users.map((u) => {
          const email = u.email as string; // filtered to only users with email above
          const badge = roleBadge(u.role);
          const isSaving = savingEmail === email;
          return (
            <div key={email} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                <User size={20} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{u.fullname || email}</p>
                <p className="text-xs text-gray-400 truncate">{email}</p>
                {u.position && <p className="text-xs text-gray-500 truncate">{u.position}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin text-green-600" />
                ) : (
                  <div className="relative">
                    <select
                      value={u.role || 'pending'}
                      onChange={(e) => handleRoleChange(email, e.target.value)}
                      className={`appearance-none text-xs font-semibold pl-2.5 pr-6 py-1.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-400 ${badge.color}`}
                    >
                      {ROLE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---- Main ProfileView ----
const ProfileView: React.FC = () => {
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'profile' | 'users'>('profile');

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-4 flex gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <User size={15} /> โปรไฟล์ของฉัน
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={15} /> จัดการผู้ใช้งาน
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'profile' && <MyProfileTab authUser={authUser} />}
        {activeTab === 'users' && isAdmin && <UserManagementTab />}
      </div>
    </div>
  );
};

export default ProfileView;
