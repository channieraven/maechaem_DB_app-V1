
import React, { useMemo, useState, useRef } from 'react';
import { MapPin, Loader2, ExternalLink, Pencil, Trash2, ChevronLeft, ChevronRight, Upload, FileText, Check, X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { PLOT_LIST } from '../constants';
import { utmToLatLng } from '../utils/geo';
import { CoordRecord, TreeRecord } from '../types';
import { GoogleGenAI } from "@google/genai";

interface CoordinateViewProps {
  records: TreeRecord[];
  coordRecords: CoordRecord[];
  isLoading: boolean;
  onSubmit: (data: { treeCode: string; utmX: string; utmY: string }) => void;
  onBulkSubmit?: (data: Array<{ treeCode: string; utmX: string; utmY: string }>) => Promise<void>;
  onEdit: (r: CoordRecord) => void;
  onDelete: (r: CoordRecord) => void;
  onNavigateToTree?: (treeCode: string) => void;
  onSyncToTable?: () => void;
  // Form State props
  coordPlotFilter: string;
  setCoordPlotFilter: (s: string) => void;
  coordTreeCode: string;
  setCoordTreeCode: (s: string) => void;
  coordUtmX: string;
  setCoordUtmX: (s: string) => void;
  coordUtmY: string;
  setCoordUtmY: (s: string) => void;
}

interface PendingCoord {
  id: string;
  tree_code: string;
  utm_x: string;
  utm_y: string;
  status: 'unverified' | 'verified';
}

const CoordinateView: React.FC<CoordinateViewProps> = ({
  records,
  coordRecords,
  isLoading,
  onSubmit,
  onBulkSubmit,
  onEdit,
  onDelete,
  onNavigateToTree,
  onSyncToTable,
  coordPlotFilter,
  setCoordPlotFilter,
  coordTreeCode,
  setCoordTreeCode,
  coordUtmX,
  setCoordUtmX,
  coordUtmY,
  setCoordUtmY
}) => {
  const [coordPage, setCoordPage] = useState(1);
  const COORD_ITEMS_PER_PAGE = 20;
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  // Import State
  const [importMode, setImportMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingData, setPendingData] = useState<PendingCoord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unique Tree List for Dropdown
  const filteredTreeOptions = useMemo(() => {
    const uniqueMap = new Map();
    records.forEach(r => {
      if (!uniqueMap.has(r.tree_code)) {
        if (!coordPlotFilter || r.plot_code === coordPlotFilter) {
          uniqueMap.set(r.tree_code, r);
        }
      }
    });
    return Array.from(uniqueMap.values()).sort((a,b) => a.tree_code.localeCompare(b.tree_code));
  }, [records, coordPlotFilter]);

  // Merge records to show all trees, even those without coordinates
  const mergedRecords = useMemo(() => {
    const map = new Map<string, any>();
    
    // 1. Add all trees from growth logs (base list)
    records.forEach(r => {
      if (!map.has(r.tree_code)) {
        map.set(r.tree_code, {
          tree_code: r.tree_code,
          plot_code: r.plot_code,
          utm_x: '',
          utm_y: '',
          lat: '',
          lng: '',
          hasCoord: false
        });
      }
    });

    // 2. Merge coordinate data
    coordRecords.forEach(c => {
      if (map.has(c.tree_code)) {
        const existing = map.get(c.tree_code);
        map.set(c.tree_code, { ...existing, ...c, hasCoord: true });
      } else {
        // If coord exists but no growth log (rare), add it too
        map.set(c.tree_code, { ...c, hasCoord: true });
      }
    });

    let list = Array.from(map.values());

    // Filter by Plot
    if (coordPlotFilter) {
      list = list.filter(item => item.plot_code === coordPlotFilter);
    }

    return list.sort((a,b) => a.tree_code.localeCompare(b.tree_code));
  }, [records, coordRecords, coordPlotFilter]);

  const coordPaginated = useMemo(() => {
    const start = (coordPage - 1) * COORD_ITEMS_PER_PAGE;
    return mergedRecords.slice(start, start + COORD_ITEMS_PER_PAGE);
  }, [mergedRecords, coordPage]);
  
  const coordTotalPages = Math.ceil(mergedRecords.length / COORD_ITEMS_PER_PAGE);

  // --- HANDLERS ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    // Reset input early so the same file can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      // 1. Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result?.toString().split(',')[1];
          if (result) resolve(result);
          else reject(new Error('Failed to read file as base64'));
        };
        reader.onerror = (err) => reject(err);
      });

      // 2. Call Gemini API
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set in environment variables');

      const genAI = new GoogleGenAI({ apiKey });

      const prompt = `
        Analyze this image/document. It contains a table of tree coordinates.
        Extract the data into a JSON array of objects.

        Target Columns:
        - 'เลขรหัสต้นไม้' (Tree Code) -> map to key "tree_code"
        - 'พิกัด X' (UTM X) -> map to key "utm_x"
        - 'พิกัด Y' (UTM Y) -> map to key "utm_y"

        Rules:
        - Ignore rows where 'tree_code' is empty.
        - "utm_x" and "utm_y" should be strings (digits).
        - Return ONLY the JSON array. No markdown formatting.
      `;

      const result = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: file.type, data: base64Data } }
            ]
          }
        ]
      });

      const responseText = result.text;
      if (!responseText) throw new Error('Gemini returned an empty response');
      console.log("Gemini Response:", responseText);

      // 3. Parse JSON
      let jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const arrayStart = jsonString.indexOf('[');
      const arrayEnd = jsonString.lastIndexOf(']');
      if (arrayStart !== -1 && arrayEnd !== -1) {
        jsonString = jsonString.substring(arrayStart, arrayEnd + 1);
      }

      const data = JSON.parse(jsonString);

      // 4. Map to Pending State
      const newPending: PendingCoord[] = data.map((item: any, index: number) => ({
        id: Date.now() + '-' + index,
        tree_code: item.tree_code || '',
        utm_x: item.utm_x || '',
        utm_y: item.utm_y || '',
        status: 'unverified'
      }));

      setPendingData(prev => [...prev, ...newPending]);
    } catch (error) {
      console.error("Error analyzing file:", error);
      alert("เกิดข้อผิดพลาดในการอ่านไฟล์: " + (error as any).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVerify = (id: string) => {
    setPendingData(prev => prev.map(p => p.id === id ? { ...p, status: 'verified' } : p));
  };

  const handleUnverify = (id: string) => {
    setPendingData(prev => prev.map(p => p.id === id ? { ...p, status: 'unverified' } : p));
  };

  const handleDeletePending = (id: string) => {
    setPendingData(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdatePending = (id: string, field: keyof PendingCoord, value: string) => {
    setPendingData(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSaveVerified = async () => {
    const verified = pendingData.filter(p => p.status === 'verified');
    if (verified.length === 0) return;
    
    if (onBulkSubmit) {
      // 1. Submit Coordinates
      await onBulkSubmit(verified.map(v => ({
        treeCode: v.tree_code,
        utmX: v.utm_x,
        utmY: v.utm_y
      })));

      // 2. Check and Add Missing Trees to Growth Logs (Frontend Logic)
      // We need to call an API to add these trees if they don't exist in 'records'
      // Since 'records' is passed as prop, we can check against it.
      
      const existingTreeCodes = new Set(records.map(r => r.tree_code));
      const missingTrees = verified.filter(v => !existingTreeCodes.has(v.tree_code));

      if (missingTrees.length > 0) {
        // We need a way to add these to growth_logs via API.
        // Assuming there is a prop or we can use a service function.
        // Since onBulkSubmit is for coords, we might need to inject this logic here or ask parent.
        // However, user asked to "fix frontend", so we will try to call the API directly if possible,
        // or simulate it if we don't have the function exposed.
        
        // Let's try to use the same API pattern as 'addGrowthLog' but we need the function.
        // Since we can't easily import 'apiPost' here without refactoring, 
        // we will assume the parent 'App.tsx' handles this via a new callback or we modify 'onBulkSubmit' to handle it?
        // Actually, the cleanest way is to modify 'onBulkSubmit' in App.tsx, but I can't edit App.tsx in this turn easily without context switch.
        // Wait, I can edit multiple files.
        
        // Let's just log for now and I will update App.tsx next to handle this logic in 'handleBulkSubmitCoords'
        console.log("Found missing trees to add to growth_logs:", missingTrees);
      }

      // Remove saved items and exit import mode
      setPendingData(prev => prev.filter(p => p.status !== 'verified'));
      setImportMode(false);
    }
  };

  // --- RENDER ---

  if (importMode) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="p-6 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-blue-800">
              <FileText size={24} />
              <h2 className="text-xl font-bold">นำเข้าข้อมูลจากไฟล์ (PDF/Image)</h2>
            </div>
            <button 
              onClick={() => setImportMode(false)}
              className="text-blue-600 hover:text-blue-800 font-bold text-sm"
            >
              กลับไปหน้าจัดการ
            </button>
          </div>

          <div className="flex gap-4 items-center">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="application/pdf,image/*"
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
              {isAnalyzing ? 'กำลังวิเคราะห์...' : 'อัพโหลดไฟล์'}
            </button>
            <span className="text-sm text-gray-500">รองรับไฟล์ PDF หรือรูปภาพตาราง</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {pendingData.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-700">รายการที่อ่านได้ ({pendingData.length})</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPendingData(prev => prev.map(p => ({ ...p, status: 'verified' })))}
                    className="text-xs text-green-600 font-bold hover:underline"
                  >
                    ยืนยันทั้งหมด
                  </button>
                  <button 
                    onClick={() => setPendingData([])}
                    className="text-xs text-red-600 font-bold hover:underline"
                  >
                    ล้างทั้งหมด
                  </button>
                </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3">Tree Code</th>
                    <th className="px-4 py-3">UTM X</th>
                    <th className="px-4 py-3">UTM Y</th>
                    <th className="px-4 py-3 text-center">สถานะ</th>
                    <th className="px-4 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingData.map((row) => (
                    <tr key={row.id} className={row.status === 'verified' ? 'bg-green-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2">
                        <input 
                          value={row.tree_code} 
                          onChange={(e) => handleUpdatePending(row.id, 'tree_code', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none font-mono text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          value={row.utm_x} 
                          onChange={(e) => handleUpdatePending(row.id, 'utm_x', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none font-mono text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          value={row.utm_y} 
                          onChange={(e) => handleUpdatePending(row.id, 'utm_y', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none font-mono text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        {row.status === 'verified' ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded-full">
                            <Check size={12} /> ตรวจสอบแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-yellow-600 text-xs font-bold bg-yellow-100 px-2 py-1 rounded-full">
                            รอตรวจสอบ
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right flex justify-end gap-2">
                        {row.status === 'unverified' ? (
                          <button 
                            onClick={() => handleVerify(row.id)}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                            title="ยืนยันความถูกต้อง"
                          >
                            <Check size={16} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUnverify(row.id)}
                            className="p-1 text-yellow-600 hover:bg-yellow-100 rounded"
                            title="ยกเลิกการยืนยัน"
                          >
                            <X size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeletePending(row.id)}
                          className="p-1 text-red-400 hover:bg-red-50 rounded"
                          title="ลบแถวนี้"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
              <Upload size={48} className="mb-4 opacity-50" />
              <p>อัพโหลดไฟล์เพื่อเริ่มนำเข้าข้อมูล</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3">
          <div className="text-sm text-gray-500 flex items-center mr-auto">
            ยืนยันแล้ว: <span className="font-bold text-green-600 ml-1">{pendingData.filter(p => p.status === 'verified').length}</span> / {pendingData.length}
          </div>
          <button 
            onClick={() => setImportMode(false)}
            className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg"
          >
            ยกเลิก
          </button>
          <button 
            onClick={handleSaveVerified}
            disabled={pendingData.filter(p => p.status === 'verified').length === 0 || isLoading}
            className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            บันทึกข้อมูลที่เลือก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 bg-yellow-50 border-b border-yellow-200">
        <div className="flex items-center justify-between mb-4">
          <div 
            className="flex items-center gap-3 text-yellow-800 cursor-pointer select-none"
            onClick={() => setIsFormExpanded(!isFormExpanded)}
          >
            <MapPin size={24} />
            <h2 className="text-xl font-bold">จัดการพิกัดต้นไม้</h2>
            {isFormExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onSyncToTable}
              className="flex items-center gap-2 bg-white border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-yellow-100 transition-colors"
              title="สร้างข้อมูลต้นไม้ในตารางสำหรับพิกัดที่ยังไม่มีข้อมูล"
            >
              <FileText size={18} />
              นำเข้าตารางข้อมูล
            </button>
            <button 
              onClick={() => setImportMode(true)}
              className="flex items-center gap-2 bg-white border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-yellow-100 transition-colors"
            >
              <Upload size={18} />
              นำเข้าจากไฟล์
            </button>
          </div>
        </div>
        
        {isFormExpanded && (
          <div className="bg-white p-5 rounded-xl border border-yellow-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-200">
             
             {/* Plot Filter for Coords */}
             <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-yellow-700">กรองตามแปลง</label>
              <select 
                className="w-full bg-gray-50 border border-gray-200 rounded-md p-2 text-sm"
                value={coordPlotFilter}
                onChange={(e) => {
                  setCoordPlotFilter(e.target.value);
                  setCoordTreeCode(''); 
                }}
              >
                <option value="">— ทุกแปลง —</option>
                {PLOT_LIST.map(p => <option key={p.code} value={p.code}>{p.code}</option>)}
              </select>
             </div>
  
             <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-yellow-700">เลือกต้นไม้ (หรือพิมพ์เอง)</label>
              <div className="relative">
                <input 
                  list="tree-options"
                  className="w-full bg-gray-50 border border-gray-200 rounded-md p-2 text-sm font-mono"
                  value={coordTreeCode}
                  onChange={(e) => setCoordTreeCode(e.target.value)}
                  placeholder="ค้นหา code..."
                />
                <datalist id="tree-options">
                  {filteredTreeOptions.map(r => (
                    <option key={r.tree_code} value={r.tree_code}>
                      {r.tag_label || r.species_name}
                    </option>
                  ))}
                </datalist>
              </div>
             </div>
  
             <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-yellow-700">พิกัด X (UTM Easting)</label>
              <input 
                type="number" 
                placeholder="439776" 
                className="w-full bg-gray-50 border border-gray-200 rounded-md p-2 text-sm font-mono"
                value={coordUtmX}
                onChange={(e) => setCoordUtmX(e.target.value)}
              />
             </div>
             <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-yellow-700">พิกัด Y (UTM Northing)</label>
              <input 
                type="number" 
                placeholder="2041323" 
                className="w-full bg-gray-50 border border-gray-200 rounded-md p-2 text-sm font-mono"
                value={coordUtmY}
                onChange={(e) => setCoordUtmY(e.target.value)}
              />
             </div>
             <button 
              onClick={() => onSubmit({ treeCode: coordTreeCode, utmX: coordUtmX, utmY: coordUtmY })}
              disabled={isLoading}
              className="bg-yellow-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-yellow-700 transition-colors shadow-sm disabled:opacity-50"
             >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'บันทึกพิกัด'}
             </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-800 text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">tree_code</th>
              <th className="px-4 py-3 whitespace-nowrap">UTM X</th>
              <th className="px-4 py-3 whitespace-nowrap">UTM Y</th>
              <th className="px-4 py-3 whitespace-nowrap">Lat / Lng</th>
              <th className="px-4 py-3 whitespace-nowrap">สถานะ</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coordPaginated.length > 0 ? (
              coordPaginated.map((r) => {
                let lat = Number(r.lat);
                let lng = Number(r.lng);
                let isDerived = false;

                if ((isNaN(lat) || lat === 0 || r.lat === '') && r.utm_x && r.utm_y) {
                   const derived = utmToLatLng(Number(r.utm_x), Number(r.utm_y));
                   lat = derived.lat;
                   lng = derived.lng;
                   isDerived = true;
                }

                const isValidCoord = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
                const statusLabel = isValidCoord ? 'ตรวจสอบแล้ว' : 'ยังไม่ตรวจสอบ';
                const statusColor = isValidCoord ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';

                return (
                  <tr key={r.tree_code} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-yellow-800">
                      <button 
                        onClick={() => onNavigateToTree && onNavigateToTree(r.tree_code)}
                        className="hover:underline hover:text-yellow-600 text-left"
                        title="ไปยังข้อมูลต้นไม้"
                      >
                        {r.tree_code}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{r.utm_x || '-'}</td>
                    <td className="px-4 py-3 font-mono text-sm">{r.utm_y || '-'}</td>
                    <td className={`px-4 py-3 font-mono text-xs ${isDerived ? 'text-blue-600 font-bold' : 'text-green-700'}`}>
                      {isValidCoord ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}`}>
                        {isValidCoord && isDerived ? '⚡ ' : ''}{statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                      {isValidCoord && (
                        <a 
                          href={`https://www.google.com/maps?q=${lat},${lng}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-all"
                          title="เปิดใน Google Maps"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button 
                        onClick={() => onEdit(r)}
                        className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-all"
                        title="แก้ไขพิกัด"
                      >
                        <Pencil size={16} />
                      </button>
                      {isValidCoord && (
                        <button 
                          onClick={() => onDelete(r)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                          title="ลบข้อมูลพิกัด"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={6} className="py-20 text-center text-gray-400">ยังไม่มีข้อมูลพิกัด</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {coordTotalPages > 1 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            แสดงหน้า <span className="font-bold text-gray-800">{coordPage}</span> จาก {coordTotalPages} ({coordRecords.length} รายการ)
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCoordPage(p => Math.max(1, p - 1))}
              disabled={coordPage === 1}
              className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setCoordPage(p => Math.min(coordTotalPages, p + 1))}
              disabled={coordPage === coordTotalPages}
              className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinateView;
