
import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Ruler, Sprout, AlertCircle } from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, ComposedChart, Line, 
  CartesianGrid, XAxis, YAxis, Tooltip, Legend, Cell, PieChart, Pie 
} from 'recharts';
import { TreeRecord } from '../types';
import { getCategoryFromRecord } from '../utils/classification';

interface StatsViewProps {
  stats: {
    total: number;
    alive: number;
    dead: number;
    alivePct: number;
    deadPct: number;
    speciesData: any[];
    plotData: any[];
  };
  records: TreeRecord[];
  coordCount: number;
}

const StatsView: React.FC<StatsViewProps> = ({ stats, records, coordCount }) => {

  // --- Advanced Calculation Logic ---
  const growthStats = useMemo(() => {
    // Filter only alive trees for growth stats
    const aliveRecords = records.filter(r => r.status === 'alive');

    // Helper to get RCD (Normalizes DBH vs Bamboo RCDs)
    const getRCD = (r: TreeRecord) => {
      if (r.dbh_cm && !isNaN(Number(r.dbh_cm))) return Number(r.dbh_cm);
      // For Bamboo, average the existing culms
      if (r.dbh_1_cm || r.dbh_2_cm || r.dbh_3_cm) {
        const vals = [r.dbh_1_cm, r.dbh_2_cm, r.dbh_3_cm].map(v => Number(v)).filter(v => !isNaN(v) && v > 0);
        if (vals.length > 0) return vals.reduce((a, b) => a + b, 0) / vals.length;
      }
      return 0;
    };

    const getHeight = (r: TreeRecord) => {
       return r.height_m && !isNaN(Number(r.height_m)) ? Number(r.height_m) : 0;
    };

    // 1. Stats by Category
    const categoryMap = new Map<string, { count: number; sumRCD: number; sumHeight: number }>();
    
    // 2. Stats by Plot
    const plotMap = new Map<string, { count: number; sumRCD: number; sumHeight: number }>();

    // 3. Stats by Species
    const speciesMap = new Map<string, { count: number; sumRCD: number; sumHeight: number }>();

    aliveRecords.forEach(r => {
       const cat = getCategoryFromRecord(r);
       const rcd = getRCD(r);
       const height = getHeight(r);
       const plot = r.plot_code;
       const species = r.species_name;

       if (rcd > 0 || height > 0) {
          // Category
          if (!categoryMap.has(cat)) categoryMap.set(cat, { count: 0, sumRCD: 0, sumHeight: 0 });
          const c = categoryMap.get(cat)!;
          c.count++;
          c.sumRCD += rcd;
          c.sumHeight += height;

          // Plot
          if (!plotMap.has(plot)) plotMap.set(plot, { count: 0, sumRCD: 0, sumHeight: 0 });
          const p = plotMap.get(plot)!;
          p.count++;
          p.sumRCD += rcd;
          p.sumHeight += height;

          // Species
          if (!speciesMap.has(species)) speciesMap.set(species, { count: 0, sumRCD: 0, sumHeight: 0 });
          const s = speciesMap.get(species)!;
          s.count++;
          s.sumRCD += rcd;
          s.sumHeight += height;
       }
    });

    const formatData = (map: Map<any, any>) => Array.from(map.entries()).map(([key, val]) => ({
      name: key,
      avgRCD: val.count ? Number((val.sumRCD / val.count).toFixed(2)) : 0,
      avgHeight: val.count ? Number((val.sumHeight / val.count).toFixed(2)) : 0,
      count: val.count
    }));

    return {
      byCategory: formatData(categoryMap),
      byPlot: formatData(plotMap).sort((a,b) => a.name.localeCompare(b.name)),
      bySpecies: formatData(speciesMap).sort((a,b) => b.count - a.count).slice(0, 10) // Top 10
    };
  }, [records]);

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 bg-gray-50/50">
      <div className="max-w-6xl mx-auto pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
              <BarChart3 className="text-green-600" /> แดชบอร์ดสถิติ
            </h2>
            <p className="text-sm text-gray-500 mt-1">วิเคราะห์ข้อมูลการเจริญเติบโตของต้นไม้ในโครงการ</p>
          </div>
          <div className="text-xs font-mono bg-white border border-gray-200 px-3 py-1.5 rounded-full text-gray-500 shadow-sm">
            Last Update: {new Date().toLocaleDateString('th-TH', { hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>

        {/* --- SECTION 1: GROWTH OVERVIEW CARDS (Category) --- */}
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
           <TrendingUp size={16} /> ค่าเฉลี่ยการเติบโต แยกตามประเภท
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {growthStats.byCategory.map((cat) => (
            <div key={cat.name} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sprout size={48} className="text-green-800" />
               </div>
               <p className="text-xs font-bold text-gray-400 uppercase mb-2">{cat.name}</p>
               <div className="flex flex-col gap-3">
                  <div>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-2xl font-mono font-bold text-gray-800">{cat.avgRCD}</span>
                      <span className="text-[10px] text-gray-500 mb-1">cm (RCD)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                       <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(cat.avgRCD * 5, 100)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-xl font-mono font-bold text-gray-800">{cat.avgHeight}</span>
                      <span className="text-[10px] text-gray-500 mb-1">m (สูง)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(cat.avgHeight * 10, 100)}%` }}></div>
                    </div>
                  </div>
               </div>
            </div>
          ))}
          {growthStats.byCategory.length === 0 && (
             <div className="col-span-full p-8 text-center bg-white rounded-xl border border-dashed text-gray-400">
               ยังไม่มีข้อมูลการเติบโตสำหรับต้นไม้ที่รอดชีวิต
             </div>
          )}
        </div>

        {/* --- SECTION 2: PLOT COMPARISON --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">เปรียบเทียบรายแปลง (RCD & สูง)</h3>
               <div className="flex gap-4 text-[10px]">
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600"></span> Avg RCD (cm)</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Avg Height (m)</div>
               </div>
             </div>
             <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={growthStats.byPlot}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" orientation="left" stroke="#166534" fontSize={10} tickFormatter={(val) => `${val}cm`} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={10} tickFormatter={(val) => `${val}m`} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Bar yAxisId="left" dataKey="avgRCD" fill="#22c55e" barSize={20} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="avgHeight" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Top Species Table */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
             <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-6">Top 10 ชนิดพันธุ์ (ค่าเฉลี่ย)</h3>
             <div className="flex-1 overflow-auto">
                <table className="w-full text-left">
                   <thead className="bg-gray-50 text-[10px] uppercase text-gray-500 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 rounded-l-lg">ชนิด</th>
                        <th className="py-2 px-3 text-right">จำนวน</th>
                        <th className="py-2 px-3 text-right">RCD (cm)</th>
                        <th className="py-2 px-3 text-right rounded-r-lg">สูง (m)</th>
                      </tr>
                   </thead>
                   <tbody className="text-sm">
                      {growthStats.bySpecies.map((s, i) => (
                        <tr key={s.name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                           <td className="py-3 px-3 font-medium text-gray-800 flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-gray-100 text-[10px] text-gray-500 flex items-center justify-center font-mono">{i+1}</span>
                              {s.name}
                           </td>
                           <td className="py-3 px-3 text-right font-mono text-gray-500">{s.count}</td>
                           <td className="py-3 px-3 text-right font-mono font-bold text-green-700">{s.avgRCD}</td>
                           <td className="py-3 px-3 text-right font-mono font-bold text-blue-600">{s.avgHeight}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>

        {/* --- SECTION 3: GENERAL STATS (Original) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">จำนวนทั้งหมด</p>
            <p className="text-3xl font-mono font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">รอด (Alive)</p>
            <p className="text-3xl font-mono font-bold text-green-600">{stats.alivePct}%</p>
            <p className="text-[10px] text-gray-400">{stats.alive} ต้น</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-red-500">
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">ตาย (Dead)</p>
            <p className="text-3xl font-mono font-bold text-red-600">{stats.deadPct}%</p>
            <p className="text-[10px] text-gray-400">{stats.dead} ต้น</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-yellow-500">
            <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider mb-1">พิกัด (GPS)</p>
            <p className="text-3xl font-mono font-bold text-yellow-600">{coordCount}</p>
            <p className="text-[10px] text-gray-400">{stats.total ? Math.round((coordCount / stats.total) * 100) : 0}% completed</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
           <div className="w-full md:w-1/3 h-56 relative">
               <h4 className="absolute top-0 left-0 text-xs font-bold text-gray-400 uppercase">สัดส่วนสุขภาพ</h4>
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie
                        data={[
                          { name: 'รอด', value: stats.alive },
                          { name: 'ตาย', value: stats.dead },
                        ]}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
               </ResponsiveContainer>
           </div>
           <div className="flex-1">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl text-blue-800 text-sm">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">คำแนะนำ</p>
                    <p>สถิติการเติบโตจะคำนวณจากต้นไม้ที่มีสถานะ <b>"รอด"</b> เท่านั้น สำหรับไม้ไผ่ ค่า RCD จะคำนวณจากค่าเฉลี่ยของลำที่บันทึกไว้</p>
                  </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default StatsView;
