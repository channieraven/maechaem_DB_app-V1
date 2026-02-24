
import React from 'react';
import { Trees, Loader2, RotateCcw, ClipboardList, MapPin, Map as MapIcon, BarChart3, History, FileImage, LogOut, User } from 'lucide-react';
import { ViewType } from '../types';

interface HeaderProps {
  stats: { total: number; alive: number; dead: number };
  isLoading: boolean;
  onRefresh: () => void;
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  user?: { name: string; fullName?: string; picture?: string; email: string } | null;
  onLogout?: () => void;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 ${
      active 
        ? 'text-white border-green-400 bg-white/5' 
        : 'text-white/60 border-transparent hover:text-white/80'
    }`}
  >
    {icon}
    {label}
  </button>
);

const Header: React.FC<HeaderProps> = ({ stats, isLoading, onRefresh, activeView, setActiveView, user, onLogout }) => {
  return (
    <header className="bg-[#2d5a27] text-white shadow-lg z-50 relative shrink-0 w-full">
      <div className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Trees size={24} className="text-green-300" />
          </div>
          <div>
            <h1 className="text-sm md:text-lg font-bold tracking-wide whitespace-nowrap">ระบบบันทึกข้อมูลรายแปลง</h1>
            <p className="text-[10px] md:text-xs text-white/90 font-medium">สำนักวิจัยและพัฒนาการป่าไม้</p>
            <p className="text-[10px] md:text-xs text-white/70 font-light hidden sm:block">โครงการปลูกป่าอเนกประสงค์ ในพื้นที่คทช. อ.แม่แจ่ม จ.เชียงใหม่</p>
            <p className="text-[10px] text-green-200 mt-0.5 font-light opacity-90 hidden sm:block">* RCD (Root Collar Diameter) = ความโตที่ระดับคอราก</p>
          </div>
        </div>
        {/* Desktop Stats */}
        <div className="hidden md:flex items-center gap-4">
          <div className="bg-white/10 px-4 py-1.5 rounded-full border border-white/20">
            <span className="text-xs text-white/60 mr-2">ทั้งหมด:</span>
            <span className="font-mono font-bold text-yellow-400">{stats.total}</span>
          </div>
          <div className="bg-white/10 px-4 py-1.5 rounded-full border border-white/20">
            <span className="text-xs text-white/60 mr-2">รอด:</span>
            <span className="font-mono font-bold text-green-400">{stats.alive}</span>
          </div>
          <div className="bg-white/10 px-4 py-1.5 rounded-full border border-white/20">
            <span className="text-xs text-white/60 mr-2">ตาย:</span>
            <span className="font-mono font-bold text-red-400">{stats.dead}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          {user && (
            <>
              {/* Desktop Profile Button */}
              <button 
                onClick={() => setActiveView('profile')}
                className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${
                  activeView === 'profile' 
                    ? 'bg-white/20 border-white/40' 
                    : 'bg-white/10 border-white/10 hover:bg-white/20'
                }`}
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <User size={16} className="text-white/80" />
                )}
                <span className="text-xs text-white/90 truncate max-w-[100px]">{user.fullName || user.name}</span>
              </button>

              {/* Mobile Profile Button */}
              <button 
                onClick={() => setActiveView('profile')}
                className={`md:hidden p-2 rounded-full transition-colors ${
                  activeView === 'profile' 
                    ? 'bg-white/20 text-white' 
                    : 'hover:bg-white/10 text-white/80'
                }`}
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <User size={20} />
                )}
              </button>
            </>
          )}
          
          <button 
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <RotateCcw size={20} />}
          </button>
          
          {onLogout && (
            <button 
              onClick={onLogout}
              className="p-2 hover:bg-red-500/20 text-white/80 hover:text-red-200 rounded-full transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
      {/* Desktop Navigation */}
      <nav className="border-t border-white/10 hidden md:block w-full">
        <div className="w-full px-4 flex overflow-x-auto no-scrollbar">
          <TabButton active={activeView === 'table'} onClick={() => setActiveView('table')} icon={<ClipboardList size={18} />} label="ตารางข้อมูล" />
          <TabButton active={activeView === 'plotInfo'} onClick={() => setActiveView('plotInfo')} icon={<FileImage size={18} />} label="ข้อมูลรายแปลง" />
          <TabButton active={activeView === 'coords'} onClick={() => setActiveView('coords')} icon={<MapPin size={18} />} label="พิกัดต้นไม้" />
          <TabButton active={activeView === 'map'} onClick={() => setActiveView('map')} icon={<MapIcon size={18} />} label="แผนที่ดาวเทียม" />
          <TabButton active={activeView === 'history'} onClick={() => setActiveView('history')} icon={<History size={18} />} label="ประวัติการเติบโต" />
          <TabButton active={activeView === 'stats'} onClick={() => setActiveView('stats')} icon={<BarChart3 size={18} />} label="สถิติ" />
        </div>
      </nav>
    </header>
  );
};

export default Header;
