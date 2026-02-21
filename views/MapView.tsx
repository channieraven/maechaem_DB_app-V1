
import React, { useMemo, useEffect, useState } from 'react';
import { Filter, Calendar, User, Pencil, History, Ruler, Info, Sprout, Save } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { PLOT_LIST, SPECIES_LIST } from '../constants';
import { CoordRecord, TreeRecord, PlantCategory } from '../types';
import { getDistance } from '../utils/geo';
import { getCategoryFromRecord } from '../utils/classification';

interface MapViewProps {
  records: TreeRecord[];
  coordRecords: CoordRecord[];
  mapPlot: string;
  setMapPlot: (s: string) => void;
  onEdit: (r: TreeRecord) => void;
  onNewSurvey: (r: TreeRecord) => void;
  onSaveSpacing?: (data: any) => void;
}

// Helper to handle auto-zoom
const MapBoundsHandler = ({ bounds }: { bounds: L.LatLngBoundsExpression | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18, animate: true });
    }
  }, [bounds, map]);
  return null;
};

const MapView: React.FC<MapViewProps> = ({
  records,
  coordRecords,
  mapPlot,
  setMapPlot,
  onEdit,
  onNewSurvey,
  onSaveSpacing
}) => {
  const [isSpacingMode, setIsSpacingMode] = useState(false);
  const [mapCategory, setMapCategory] = useState<PlantCategory | ''>('');
  const [mapSpecies, setMapSpecies] = useState('');

  // Get categories available in current plot
  const availableCategories = useMemo(() => {
    const set = new Set<PlantCategory>();
    records.forEach(r => {
      if (!mapPlot || r.plot_code === mapPlot) {
        set.add(getCategoryFromRecord(r));
      }
    });
    return Array.from(set).sort();
  }, [records, mapPlot]);

  // Get species available in current plot/category
  const availableSpecies = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      const matchPlot = !mapPlot || r.plot_code === mapPlot;
      const matchCat = !mapCategory || getCategoryFromRecord(r) === mapCategory;
      if (matchPlot && matchCat) {
        set.add(r.species_name);
      }
    });
    return Array.from(set).sort();
  }, [records, mapPlot, mapCategory]);

  // Unified logic to check if a coordinate record matches all filters
  const filteredTrees = useMemo(() => {
    return coordRecords.filter(r => {
      // 1. Plot Filter
      if (mapPlot && r.plot_code !== mapPlot) return false;

      // Find logs to get species info
      const treeLogs = records.filter(g => g.tree_code === r.tree_code);
      if (treeLogs.length === 0) {
        // If we have filters for category/species but no log found, we hide it
        return !mapCategory && !mapSpecies;
      }
      
      // Sort to get latest log for accurate classification
      treeLogs.sort((a,b) => new Date(b.survey_date).getTime() - new Date(a.survey_date).getTime());
      const latest = treeLogs[0];

      // 2. Category Filter
      if (mapCategory && getCategoryFromRecord(latest) !== mapCategory) return false;

      // 3. Species Filter
      if (mapSpecies && latest.species_name !== mapSpecies) return false;

      return true;
    });
  }, [coordRecords, records, mapPlot, mapCategory, mapSpecies]);

  const mapBounds = useMemo(() => {
    if (filteredTrees.length === 0) return null;
    const latLngs = filteredTrees
      .map(r => [Number(r.lat), Number(r.lng)] as [number, number])
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0);
    
    if (latLngs.length === 0) return null;
    return L.latLngBounds(latLngs);
  }, [filteredTrees]);

  // Spacing Analysis respects current filters
  const spacingAnalysis = useMemo(() => {
    if (!isSpacingMode) return null;

    const visibleTrees = filteredTrees
      .map(r => ({
        ...r,
        lat: Number(r.lat),
        lng: Number(r.lng)
      }))
      .filter(t => !isNaN(t.lat) && !isNaN(t.lng) && t.lat !== 0 && t.lng !== 0);

    if (visibleTrees.length < 2) return null;

    const connections: { from: [number, number], to: [number, number], distance: number, code: string }[] = [];
    const distances: number[] = [];

    visibleTrees.forEach((tree, i) => {
      let minDistance = Infinity;
      let nearestNeighborIndex = -1;

      visibleTrees.forEach((other, j) => {
        if (i === j) return;
        const d = getDistance(tree.lat, tree.lng, other.lat, other.lng);
        if (d < minDistance) {
          minDistance = d;
          nearestNeighborIndex = j;
        }
      });

      if (nearestNeighborIndex !== -1) {
        const other = visibleTrees[nearestNeighborIndex];
        const connectionKey = [tree.tree_code, other.tree_code].sort().join('-');
        if (!connections.some(c => [c.code, tree.tree_code].sort().join('-') === connectionKey)) {
          connections.push({
            from: [tree.lat, tree.lng],
            to: [other.lat, other.lng],
            distance: minDistance,
            code: tree.tree_code
          });
        }
        distances.push(minDistance);
      }
    });

    if (distances.length === 0) return null;

    const avg = distances.reduce((a, b) => a + b, 0) / distances.length;
    const min = Math.min(...distances);
    const max = Math.max(...distances);

    return { connections, avg, min, max, count: visibleTrees.length };
  }, [isSpacingMode, filteredTrees]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 w-64 md:w-auto">
        {/* Filter Controls Panel */}
        <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-200 flex flex-col gap-2">
           <div className="flex items-center gap-2 mb-1 px-1">
              <Filter size={14} className="text-green-600" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">กรองข้อมูลแผนที่</span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Plot Select */}
              <div className="flex flex-col gap-0.5">
                <select 
                    value={mapPlot}
                    onChange={(e) => { setMapPlot(e.target.value); setMapCategory(''); setMapSpecies(''); }}
                    className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none cursor-pointer"
                >
                  <option value="">— ทุกแปลง —</option>
                  {PLOT_LIST.map(p => <option key={p.code} value={p.code}>{p.code}</option>)}
                </select>
              </div>

              {/* Category Select */}
              <div className="flex flex-col gap-0.5">
                <select 
                    value={mapCategory}
                    onChange={(e) => { setMapCategory(e.target.value as any); setMapSpecies(''); }}
                    className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none cursor-pointer"
                >
                  <option value="">— ทุกประเภท —</option>
                  {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              {/* Species Select */}
              <div className="flex flex-col gap-0.5">
                <select 
                    value={mapSpecies}
                    onChange={(e) => setMapSpecies(e.target.value)}
                    disabled={availableSpecies.length === 0}
                    className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">— ทุกชนิดพันธุ์ —</option>
                  {availableSpecies.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
           </div>
        </div>

        <button 
          onClick={() => setIsSpacingMode(!isSpacingMode)}
          className={`p-2.5 rounded-xl shadow-lg border flex items-center justify-center gap-2 transition-all font-bold text-xs ${
            isSpacingMode ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Ruler size={16} />
          {isSpacingMode ? 'ปิดการวิเคราะห์ระยะปลูก' : 'วิเคราะห์ระยะปลูกอัตโนมัติ'}
        </button>
      </div>

      {/* Legend Only */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3 items-end">
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-xl border border-gray-200 hidden md:block w-48">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> คำอธิบายสัญลักษณ์
          </h4>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5 text-[11px] font-bold text-gray-700">
              <span className="w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></span> รอด (Alive)
            </div>
            <div className="flex items-center gap-2.5 text-[11px] font-bold text-gray-700">
              <span className="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></span> ตาย (Dead)
            </div>
            <div className="flex items-center gap-2.5 text-[11px] font-bold text-gray-700">
              <span className="w-3.5 h-3.5 bg-gray-400 rounded-full border-2 border-white shadow-sm"></span> ยังไม่สำรวจ
            </div>
          </div>
          {filteredTrees.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
              แสดงอยู่: <span className="text-green-700 font-bold">{filteredTrees.length}</span> ต้น
            </div>
          )}
        </div>
      </div>

      {/* Spacing Summary (Bottom Center) */}
      {spacingAnalysis && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-xs px-4 pointer-events-none">
           <div className="bg-blue-600/95 backdrop-blur text-white p-3 rounded-xl shadow-2xl border border-blue-500 w-full animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2 font-bold text-xs">
                 <Ruler size={14} className="text-blue-200" /> สรุประยะปลูก (เฉลี่ย)
               </div>
               {onSaveSpacing && (
                 <button 
                   onClick={() => onSaveSpacing(spacingAnalysis)}
                   className="bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition-colors"
                   title="บันทึกข้อมูล"
                 >
                   <Save size={14} />
                 </button>
               )}
             </div>
             
             <div className="flex items-end justify-between gap-4 mb-2">
                <div>
                   <p className="text-[8px] text-blue-200 uppercase font-bold tracking-widest mb-0.5">ระยะห่างเฉลี่ย</p>
                   <p className="text-2xl font-mono font-bold leading-none">{spacingAnalysis.avg.toFixed(2)} <span className="text-[10px] font-normal opacity-70">m</span></p>
                </div>
                <div className="flex gap-3 text-right">
                   <div>
                      <p className="text-[8px] text-blue-200 uppercase font-bold">แคบสุด</p>
                      <p className="text-xs font-mono font-bold">{spacingAnalysis.min.toFixed(1)}m</p>
                   </div>
                   <div>
                      <p className="text-[8px] text-blue-200 uppercase font-bold">กว้างสุด</p>
                      <p className="text-xs font-mono font-bold">{spacingAnalysis.max.toFixed(1)}m</p>
                   </div>
                </div>
             </div>
             
             <div className="text-[8px] text-blue-100 flex items-start gap-1.5 leading-relaxed bg-blue-800/30 p-1.5 rounded-lg">
                <Info size={10} className="shrink-0 mt-0.5" />
                <span>อ้างอิงจากต้นไม้ที่ใกล้ที่สุดของแต่ละคู่ เฉพาะที่แสดงอยู่บนแผนที่</span>
             </div>
           </div>
        </div>
      )}

      <MapContainer 
        center={[18.4900, 98.3800]} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.google.com/maps">Google Satellite</a>'
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          maxZoom={20}
        />
        
        <MapBoundsHandler bounds={mapBounds} />

        {/* Spacing Lines */}
        {spacingAnalysis?.connections.map((conn, idx) => (
          <Polyline 
            key={`spacing-${idx}`} 
            positions={[conn.from, conn.to]} 
            color="#3b82f6" 
            weight={2} 
            dashArray="5, 5"
            opacity={0.8}
          >
            <Tooltip permanent direction="center" className="spacing-tooltip">
              <span className="font-mono text-[10px] font-bold text-blue-700 bg-white/95 px-1.5 py-0.5 rounded-lg shadow-md border border-blue-200">
                {conn.distance.toFixed(1)}m
              </span>
            </Tooltip>
          </Polyline>
        ))}

        {filteredTrees.map((r, i) => {
          if (r.lat == null || r.lat === '' || r.lng == null || r.lng === '') return null;
          const lat = Number(r.lat);
          const lng = Number(r.lng);
          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

          // Find logs and get the latest one
          const treeLogs = records.filter(g => g.tree_code === r.tree_code);
          treeLogs.sort((a,b) => new Date(b.survey_date).getTime() - new Date(a.survey_date).getTime());
          const latestLog = treeLogs[0];
          
          const isAlive = latestLog?.status === 'alive';
          const isDead = latestLog?.status === 'dead';
          const color = isAlive ? '#22c55e' : isDead ? '#ef4444' : '#9ca3af';

          const customIcon = new L.DivIcon({
            html: `<div style="background-color: ${color}; width: 14px; height: 14px; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.5)"></div>`,
            className: 'custom-tree-marker',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });

          return (
            <Marker key={i} position={[lat, lng]} icon={customIcon}>
              <Popup>
                <div className="p-1 min-w-[220px]">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                     <div className="font-bold text-green-900 text-sm tracking-tight">{r.tree_code}</div>
                     <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isAlive ? 'bg-green-100 text-green-700' : isDead ? 'bg-red-100 text-red-700' : 'bg-gray-100'}`}>
                        {isAlive ? 'รอด' : isDead ? 'ตาย' : '?'}
                     </span>
                  </div>
                  
                  <div className="text-[10px] text-gray-500 mb-3 font-mono bg-gray-50 p-2 rounded-lg border border-gray-100">
                     {latestLog?.tag_label || 'ไม่มีข้อมูลป้าย'}
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 text-xs mb-4 px-1">
                    <span className="text-gray-400">ชนิด:</span>
                    <span className="font-bold text-gray-800">{latestLog?.species_name || '—'}</span>
                    <span className="text-gray-400">RCD:</span>
                    <span className="font-mono font-bold text-blue-600">{latestLog?.dbh_cm || '—'} cm</span>
                    <span className="text-gray-400">ความสูง:</span>
                    <span className="font-mono font-bold text-green-600">{latestLog?.height_m || '—'} m</span>
                  </div>

                  {latestLog && (
                    <div className="mb-4 bg-gray-50 p-2.5 rounded-xl text-[10px] text-gray-600 space-y-1.5 border border-gray-100">
                       <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-gray-400" />
                          <span>สำรวจล่าสุด: <b className="text-gray-800">{latestLog.survey_date}</b></span>
                       </div>
                       <div className="flex items-center gap-2">
                          <User size={12} className="text-gray-400" />
                          <span>ผู้บันทึก: <b className="text-gray-800">{latestLog.recorder || '-'}</b></span>
                       </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                     {latestLog && (
                        <button 
                          onClick={() => onEdit(latestLog)}
                          className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[10px] py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all font-bold"
                        >
                           <Pencil size={12} /> แก้ไข
                        </button>
                     )}
                     <button 
                       onClick={() => latestLog ? onNewSurvey(latestLog) : alert('ต้องมีข้อมูลเริ่มต้นก่อนเพิ่มข้อมูลใหม่')}
                       className="flex-1 bg-green-700 hover:bg-green-800 text-white text-[10px] py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all font-bold shadow-md"
                     >
                        <History size={12} /> สำรวจใหม่
                     </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <style>{`
        .spacing-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .spacing-tooltip::before {
          display: none !important;
        }
        .custom-tree-marker {
          transition: transform 0.2s ease-out;
        }
        .custom-tree-marker:hover {
          transform: scale(1.3);
          z-index: 1000 !important;
        }
      `}</style>
    </div>
  );
};

export default MapView;
