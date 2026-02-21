import React, { useState, useEffect } from 'react';
import { User, Building2, Briefcase, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileSetupModalProps {
  onComplete: () => void;
}

const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({ onComplete }) => {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || user?.name || '');
  const [position, setPosition] = useState(user?.position || '');
  const [affiliation, setAffiliation] = useState(user?.affiliation || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // เพิ่ม auto-fill: อัปเดตข้อมูลเมื่อ user เปลี่ยน
  useEffect(() => {
    setFullName(user?.fullName || user?.name || '');
    setPosition(user?.position || '');
    setAffiliation(user?.affiliation || '');
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !position || !affiliation) return;

    setIsSubmitting(true);
    try {
      await updateProfile({ fullName, position, affiliation });
      onComplete();
    } catch (error) {
      console.error(error);
      alert('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">ข้อมูลผู้ใช้งาน</h2>
          <p className="text-gray-500 mt-2">กรุณากรอกข้อมูลเพิ่มเติมเพื่อใช้ในการบันทึกข้อมูล</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="เช่น นายรักป่า ไม้งาม"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="เช่น นักวิชาการป่าไม้"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สังกัด / หน่วยงาน</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="เช่น สำนักวิจัยและพัฒนาการป่าไม้"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            บันทึกข้อมูล
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetupModal;
