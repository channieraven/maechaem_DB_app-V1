
import React from 'react';
import { ClipboardList, MapPin, Map as MapIcon, BarChart3, History, FileImage } from 'lucide-react';
import { ViewType } from '../types';

interface MobileNavProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
}

const MobileNavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center shrink-0 w-1/6 py-2 transition-colors active:scale-95 ${
      active ? 'text-green-700 bg-green-50' : 'text-gray-500 hover:bg-gray-50'
    }`}
    style={{ width: '16.66%' }} // 100% / 6 items
  >
    <div className={active ? 'text-green-600' : 'text-gray-400'}>{icon}</div>
    <span className="text-[9px] font-medium mt-1 whitespace-nowrap">{label}</span>
  </button>
);

const MobileNav: React.FC<MobileNavProps> = ({ activeView, setActiveView }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-[3000] flex overflow-x-auto no-scrollbar shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <MobileNavButton active={activeView === 'table'} onClick={() => setActiveView('table')} icon={<ClipboardList size={20} />} label="ตาราง" />
      <MobileNavButton active={activeView === 'plotInfo'} onClick={() => setActiveView('plotInfo')} icon={<FileImage size={20} />} label="ข้อมูลแปลง" />
      <MobileNavButton active={activeView === 'coords'} onClick={() => setActiveView('coords')} icon={<MapPin size={20} />} label="พิกัด" />
      <MobileNavButton active={activeView === 'map'} onClick={() => setActiveView('map')} icon={<MapIcon size={20} />} label="แผนที่" />
      <MobileNavButton active={activeView === 'history'} onClick={() => setActiveView('history')} icon={<History size={20} />} label="ประวัติ" />
      <MobileNavButton active={activeView === 'stats'} onClick={() => setActiveView('stats')} icon={<BarChart3 size={20} />} label="สถิติ" />
    </nav>
  );
};

export default MobileNav;
