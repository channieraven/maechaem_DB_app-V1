
import React, { useState, useMemo } from 'react';
import { History, Search, TreePine, Calendar, User, TrendingUp, Info } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { TreeRecord, PlantCategory } from '../types';
import { PLOT_LIST } from '../constants';
import { getCategoryFromRecord } from '../utils/classification';

interface HistoryViewProps {
  records: TreeRecord[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ records }) => {
  const [selectedPlot, setSelectedPlot] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PlantCategory | ''>('');
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [selectedTreeCode, setSelectedTreeCode] = useState('');

  // 1. Get Categories available in the dataset
  const categories = useMemo(() => {
    const set = new Set<PlantCategory>();
    records.forEach(r => set.add(getCategoryFromRecord(r)));
    return Array.from(set).sort();
  }, [records]);

  // 2. Filter species based on selected category
  const filteredSpecies = useMemo(() => {
    if (!selectedCategory) return [];
    const set = new Set<string>();
    records.forEach(r => {
      if (getCategoryFromRecord(r) === selectedCategory) {
        set.add(r.species_name);
      }
    });
    return Array.from(set).sort();
  }, [records, selectedCategory]);

  // 3. Filter tree codes based on previous filters
  const filteredTreeCodes = useMemo(() => {
    const set = new Map<string, string>(); // Code -> Label
    records.forEach(r => {
      const matchPlot = !selectedPlot || r.plot_code === selectedPlot;
      const matchCat = !selectedCategory || getCategoryFromRecord(r) === selectedCategory;
      const matchSpec = !selectedSpecies || r.species_name === selectedSpecies;
      
      if (matchPlot && matchCat && matchSpec) {
        set.set(r.tree_code, `${r.tree_code} (${r.tag_label || 'ไม่มีป้าย'})`);
      }
    });
    return Array.from(set.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [records, selectedPlot, selectedCategory, selectedSpecies]);

  // 4. Get Data for the selected tree
  const treeHistory = useMemo(() => {
    if (!selectedTreeCode) return [];
    
    return records
      .filter(r => r.tree_code === selectedTreeCode)
      .map(r => {
        // Calculate average RCD for Bamboo if needed
        let rcd = 0;
        if (r.dbh_cm) rcd = Number(r.dbh_cm);
        else if (r.dbh_1_cm || r.dbh_2_cm || r.dbh_3_cm) {
          const vals = [r.dbh_1_cm, r.dbh_2_cm, r.dbh_3_cm].map(v => Number(v)).filter(v => !isNaN(v) && v > 0);
          rcd = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        }

        return {
          date: r.survey_date,
          rcd: rcd || 0,
          height: Number(r.height_m) || 0,
          status: r.status,
          recorder: r.recorder,
          note: r.note,
          fullRecord: r
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [records, selectedTreeCode]);

  const latestInfo = treeHistory[treeHistory.length - 1];

  return (
    <div className="flex-1 overflow-auto bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto pb-20">
        
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <History className="text-blue-600" /> ประวัติการเติบโตรายต้น
          </h2>
          <p className="text-sm text-gray-500 mt-1">ติดตามพัฒนาการย้อนหลังของต้นไม้แต่ละต้นตามช่วงเวลา</p>
        </div>

        {/* Filters Grid */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. เลือกแปลง</label>
            <select 
              className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              value={selectedPlot}
              onChange={(e) => { setSelectedPlot(e.target.value); setSelectedTreeCode(''); }}
            >
              <option value="">— ทั้งหมด —</option>
              {PLOT_LIST.map(p => <option key={p.code} value={p.code}>{p.code} - {p.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">2. ประเภทพืช</label>
            <select 
              className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value as any); setSelectedSpecies(''); setSelectedTreeCode(''); }}
            >
              <option value="">— เลือกประเภท —</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">3. ชนิดพันธุ์</label>
            <select 
              className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              value={selectedSpecies}
              onChange={(e) => { setSelectedSpecies(e.target.value); setSelectedTreeCode(''); }}
              disabled={!selectedCategory}
            >
              <option value="">— เลือกชนิด —</option>
              {filteredSpecies.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">4. รหัสต้นไม้ (Tree Code)</label>
            <select 
              className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-sm font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-500/20"
              value={selectedTreeCode}
              onChange={(e) => setSelectedTreeCode(e.target.value)}
              disabled={filteredTreeCodes.length === 0}
            >
              <option value="">— เลือกต้นไม้ ({filteredTreeCodes.length}) —</option>
              {filteredTreeCodes.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </div>
        </div>

        {/* Visual Content */}
        {!selectedTreeCode ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-20 flex flex-col items-center justify-center text-gray-400 text-center">
            <Search size={64} strokeWidth={1} className="mb-4 opacity-20" />
            <h3 className="text-lg font-bold">กรุณาเลือกต้นไม้เพื่อดูประวัติ</h3>
            <p className="text-sm">ระบบจะแสดงกราฟแนวโน้มการเติบโตและประวัติการบันทึกทั้งหมด</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Quick Info Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm md:col-span-2 flex flex-col md:flex-row items-center gap-8">
                  <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                     <TreePine size={48} className="text-blue-600" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                     <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                        <h3 className="text-2xl font-bold text-gray-800">{selectedTreeCode}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${latestInfo?.status === 'alive' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                           {latestInfo?.status === 'alive' ? 'รอด (Alive)' : 'ตาย (Dead)'}
                        </span>
                     </div>
                     <p className="text-gray-500 text-sm mb-4">ชนิด: <span className="font-bold text-gray-700">{latestInfo?.fullRecord?.species_name}</span> | ป้าย: <span className="font-mono text-xs">{latestInfo?.fullRecord?.tag_label}</span></p>
                     <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                           <Calendar size={14} /> สำรวจครั้งแรก: {treeHistory[0]?.date}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                           <TrendingUp size={14} /> บันทึกแล้ว: {treeHistory.length} ครั้ง
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-[#2d5a27] text-white p-6 rounded-2xl shadow-md flex flex-col justify-between">
                  <h4 className="text-xs font-bold uppercase opacity-60">ค่าเฉลี่ยล่าสุด</h4>
                  <div className="flex justify-between items-end mt-4">
                     <div>
                        <p className="text-3xl font-mono font-bold">{latestInfo?.rcd.toFixed(1)} <span className="text-xs">cm</span></p>
                        <p className="text-[10px] uppercase opacity-60 mt-1">RCD (คอราก)</p>
                     </div>
                     <div className="text-right">
                        <p className="text-3xl font-mono font-bold">{latestInfo?.height.toFixed(1)} <span className="text-xs">m</span></p>
                        <p className="text-[10px] uppercase opacity-60 mt-1">ความสูง</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={16} /> กราฟแนวโน้มการเติบโต
                  </h3>
                  <div className="flex gap-4 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"></span> RCD (cm)</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500"></span> สูง (m)</div>
                  </div>
               </div>
               <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={treeHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10, fill: '#9ca3af' }} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={10}
                      />
                      <YAxis 
                        yAxisId="left" 
                        orientation="left" 
                        stroke="#3b82f6" 
                        fontSize={10} 
                        tickFormatter={(val) => `${val}`} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#10b981" 
                        fontSize={10} 
                        tickFormatter={(val) => `${val}`} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                      />
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="rcd" 
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                        activeDot={{ r: 6 }} 
                        name="RCD (cm)"
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="height" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                        activeDot={{ r: 6 }}
                        name="สูง (m)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* History Table Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
               <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <History size={16} className="text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">บันทึกประวัติทั้งหมด</h3>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead className="bg-gray-50/50 text-[10px] uppercase text-gray-400 font-bold border-b border-gray-100">
                        <tr>
                           <th className="py-3 px-6">วันที่สำรวจ</th>
                           <th className="py-3 px-4">สถานะ</th>
                           <th className="py-3 px-4 text-right">RCD (cm)</th>
                           <th className="py-3 px-4 text-right">สูง (m)</th>
                           <th className="py-3 px-4">ผู้บันทึก</th>
                           <th className="py-3 px-6">หมายเหตุ</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {treeHistory.slice().reverse().map((h, idx) => (
                           <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 px-6 text-sm font-bold text-gray-700">{h.date}</td>
                              <td className="py-4 px-4">
                                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.status === 'alive' ? 'text-green-600' : 'text-red-600'}`}>
                                    {h.status === 'alive' ? 'รอด' : 'ตาย'}
                                 </span>
                              </td>
                              <td className="py-4 px-4 text-right font-mono text-sm text-blue-600 font-bold">{h.rcd.toFixed(2)}</td>
                              <td className="py-4 px-4 text-right font-mono text-sm text-green-600 font-bold">{h.height.toFixed(2)}</td>
                              <td className="py-4 px-4 text-xs text-gray-500">
                                 <div className="flex items-center gap-1.5">
                                    <User size={12} /> {h.recorder}
                                 </div>
                              </td>
                              <td className="py-4 px-6 text-xs text-gray-400 italic">{h.note || '-'}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 text-blue-800 text-xs">
               <Info size={16} className="shrink-0 mt-0.5" />
               <p>ข้อมูลในกราฟและตารางถูกคำนวณย้อนหลังจากประวัติการบันทึกทั้งหมดที่พบในฐานข้อมูล (Time-series) หากพบข้อมูลที่ผิดปกติ กรุณาตรวจสอบวันที่สำรวจและผู้บันทึกในตารางด้านบน</p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
