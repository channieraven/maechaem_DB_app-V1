
import React, { useMemo, useState, useRef } from 'react';
import { Search, Loader2, Pencil, Trash2, Plus, Sprout, Leaf, Eraser, Upload, FileText, Check, X, Save, Map } from 'lucide-react';
import { PLOT_LIST, SPECIES_LIST } from '../constants';
import { TreeRecord, PlantCategory } from '../types';
import { getCategoryFromRecord, getCategoryColor } from '../utils/classification';
import { GoogleGenAI } from '@google/genai';

interface TableViewProps {
  records: TreeRecord[];
  supplementaryRecords: TreeRecord[];
  activeDataset: 'plan' | 'supp';
  setActiveDataset: (d: 'plan' | 'supp') => void;
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  plotFilter: string;
  setPlotFilter: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  editLogId: string | null;
  onEdit: (r: TreeRecord) => void;
  onDelete: (r: TreeRecord) => void;
  onOpenMobileForm: () => void;
  onClearForm: () => void;
  onCleanDuplicates: () => void;
  onNavigateToMap?: (plotCode: string) => void;
  onBulkSubmitGrowthLogs?: (data: Array<{
    tree_code: string; plot_code: string; species_code: string; species_name: string;
    species_group: string; tree_number: string; row_main: string; row_sub: string;
    tag_label: string; status: string; height_m: string; dbh_cm: string;
    bamboo_culms: string; note: string; survey_date: string; recorder: string;
  }>) => Promise<void>;
}

interface PendingGrowthRecord {
  id: string;
  tree_code: string;
  plot_code: string;
  species_code: string;
  species_name: string;
  tree_number: string;
  row_main: string;
  row_sub: string;
  status: string;
  height_m: string;
  dbh_cm: string;
  bamboo_culms: string;
  note: string;
  survey_date: string;
  recorder: string;
  verified: boolean;
}

const CATEGORIES: PlantCategory[] = ['ไม้ป่า', 'ยางพารา', 'ผลผลิตไผ่', 'ไม้ผล', 'กล้วย'];

const TableView: React.FC<TableViewProps> = ({
  records,
  supplementaryRecords,
  activeDataset,
  setActiveDataset,
  isLoading,
  searchTerm,
  setSearchTerm,
  plotFilter,
  setPlotFilter,
  statusFilter,
  setStatusFilter,
  editLogId,
  onEdit,
  onDelete,
  onOpenMobileForm,
  onClearForm,
  onCleanDuplicates,
  onNavigateToMap,
  onBulkSubmitGrowthLogs
}) => {
  const [activeCategory, setActiveCategory] = useState<PlantCategory>('ไม้ป่า');

  // Import State
  const [importMode, setImportMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingData, setPendingData] = useState<PendingGrowthRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine which records to display based on active dataset
  const displayRecords = activeDataset === 'supp' ? supplementaryRecords : records;

  const filteredRecords = useMemo(() => {
    const result = displayRecords.filter(r => {
      const matchesSearch = !searchTerm || 
        r.tree_code?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.species_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlot = !plotFilter || r.plot_code === plotFilter;
      const matchesStatus = !statusFilter || r.status === statusFilter;
      const category = getCategoryFromRecord(r);
      const matchesCategory = category === activeCategory;
      
      return matchesSearch && matchesPlot && matchesStatus && matchesCategory;
    });

    // Sort by Plot Code then Tree Number
    return result.sort((a, b) => {
      // 1. Plot Code (String comparison)
      const plotA = a.plot_code || '';
      const plotB = b.plot_code || '';
      if (plotA < plotB) return -1;
      if (plotA > plotB) return 1;

      // 2. Tree Number (Numeric comparison)
      // Use existing tree_number or extract from code
      const numA = a.tree_number || parseInt(a.tree_code.slice(-3), 10) || 0;
      const numB = b.tree_number || parseInt(b.tree_code.slice(-3), 10) || 0;
      return numA - numB;
    });
  }, [displayRecords, searchTerm, plotFilter, statusFilter, activeCategory]);

  // --- IMPORT HANDLERS ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
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

      const speciesListHint = SPECIES_LIST.map(s => `${s.code}=${s.name}`).join(', ');
      const plotListHint = PLOT_LIST.map(p => p.code).join(', ');

      const prompt = `
        Analyze this image/document. It contains a table of tree survey data.
        Extract each row into a JSON array of objects.

        Target Columns (map to these keys):
        - 'เลขรหัสต้นไม้' or tree code -> "tree_code"
        - 'รหัสแปลง' or plot code -> "plot_code" (values like: ${plotListHint})
        - 'ชนิดพันธุ์' or species name -> "species_name"
        - 'รหัสชนิดพันธุ์' or species code -> "species_code" (values like: ${speciesListHint})
        - 'ต้นที่' or tree number -> "tree_number" (string)
        - 'แถวหลัก' or main row -> "row_main" (string)
        - 'แถวย่อย' or sub row -> "row_sub" (string)
        - 'สถานะ' or status -> "status" ("alive", "dead", or "")
        - 'ความสูง' or height (m) -> "height_m" (string, digits only)
        - 'RCD' or 'DBH' or diameter -> "dbh_cm" (string, digits only)
        - 'จำนวนลำ' or bamboo culms -> "bamboo_culms" (string)
        - 'หมายเหตุ' or note -> "note" (string)
        - 'วันที่' or survey date -> "survey_date" (YYYY-MM-DD format)
        - 'ผู้บันทึก' or recorder -> "recorder" (string)

        Rules:
        - Ignore rows where both 'tree_code' and 'tree_number' are empty.
        - All numeric values should be plain strings (digits/decimals only, no units).
        - Return ONLY the JSON array. No markdown, no explanation.
      `;

      let responseText: string;
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (apiKey) {
        const genAI = new GoogleGenAI({ apiKey });
        const result = await genAI.models.generateContent({
          model: 'gemini-1.5-flash',
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
        responseText = result.text ?? '';
      } else {
        const apiBase = (import.meta as any).env?.VITE_API_URL || '';
        if (!apiBase && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
          throw new Error('ไม่พบการตั้งค่า API Key หรือ API URL กรุณาตั้งค่า VITE_GEMINI_API_KEY หรือ VITE_API_URL');
        }
        const resp = await fetch(`${apiBase}/api/gemini`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, imageData: base64Data, mimeType: file.type }),
        });
        let json: any;
        try { json = await resp.json(); } catch { json = {}; }
        if (!resp.ok) throw new Error(json.error || `Gemini API proxy error (${resp.status})`);
        responseText = json.text ?? '';
      }

      if (!responseText) throw new Error('Gemini returned an empty response');
      console.log('Gemini Growth Log Response:', responseText);

      let jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const arrayStart = jsonString.indexOf('[');
      const arrayEnd = jsonString.lastIndexOf(']');
      if (arrayStart !== -1 && arrayEnd !== -1) {
        jsonString = jsonString.substring(arrayStart, arrayEnd + 1);
      }
      const data = JSON.parse(jsonString);

      const today = new Date().toISOString().split('T')[0];
      const newPending: PendingGrowthRecord[] = data.map((item: any, index: number) => {
        // Try to find species_code from species_name if not provided
        let speciesCode = item.species_code || '';
        if (!speciesCode && item.species_name) {
          const found = SPECIES_LIST.find(s =>
            s.name.toLowerCase() === item.species_name.toLowerCase() ||
            item.species_name.toLowerCase().includes(s.name.toLowerCase())
          );
          if (found) speciesCode = found.code;
        }
        return {
          id: `${Date.now()}-${index}`,
          tree_code: item.tree_code || '',
          plot_code: item.plot_code || '',
          species_code: speciesCode,
          species_name: item.species_name || (SPECIES_LIST.find(s => s.code === speciesCode)?.name || ''),
          tree_number: item.tree_number ? String(item.tree_number) : '',
          row_main: item.row_main ? String(item.row_main) : '',
          row_sub: item.row_sub ? String(item.row_sub) : '',
          status: item.status || '',
          height_m: item.height_m ? String(item.height_m) : '',
          dbh_cm: item.dbh_cm ? String(item.dbh_cm) : '',
          bamboo_culms: item.bamboo_culms ? String(item.bamboo_culms) : '',
          note: item.note || '',
          survey_date: item.survey_date || today,
          recorder: item.recorder || '',
          verified: false
        };
      });

      setPendingData(prev => [...prev, ...newPending]);
    } catch (error) {
      console.error('Error analyzing file:', error);
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + (error as any).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVerifyPending = (id: string) => setPendingData(prev => prev.map(p => p.id === id ? { ...p, verified: true } : p));
  const handleUnverifyPending = (id: string) => setPendingData(prev => prev.map(p => p.id === id ? { ...p, verified: false } : p));
  const handleDeletePending = (id: string) => setPendingData(prev => prev.filter(p => p.id !== id));
  const handleUpdatePending = (id: string, field: keyof PendingGrowthRecord, value: string) =>
    setPendingData(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  const handleSaveVerified = async () => {
    const verified = pendingData.filter(p => p.verified);
    if (verified.length === 0 || !onBulkSubmitGrowthLogs) return;

    const payload = verified.map(v => {

      // Build tree_code if not present
      let treeCode = v.tree_code;
      if (!treeCode && v.plot_code && speciesCode && v.tree_number) {
        treeCode = `${v.plot_code}${speciesCode}${v.tree_number.padStart(3, '0')}`;
      }

      // Build tag_label
      const plot = PLOT_LIST.find(p => p.code === v.plot_code);
      const plotShort = plot?.short || v.plot_code;
      const mainPad = v.row_main.toString().padStart(2, '0');
      const tagLabel = v.tree_number
        ? `${v.tree_number} ${plotShort} ${mainPad} (${v.row_sub}) ${speciesName}`
        : treeCode;

      return {
        tree_code: treeCode,
        plot_code: v.plot_code,
        species_code: speciesCode,
        species_name: speciesName,
        species_group: speciesGroup,
        tree_number: v.tree_number,
        row_main: v.row_main,
        row_sub: v.row_sub,
        tag_label: tagLabel,
        status: v.status,
        height_m: v.height_m,
        dbh_cm: v.dbh_cm,
        bamboo_culms: v.bamboo_culms,
        note: v.note,
        survey_date: v.survey_date,
        recorder: v.recorder
      };
    });

    await onBulkSubmitGrowthLogs(payload);
    setPendingData(prev => prev.filter(p => !p.verified));
    setImportMode(false);
  };

  // --- IMPORT MODE RENDER ---

  if (importMode) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="p-6 bg-green-50 border-b border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-green-800">
              <FileText size={24} />
              <h2 className="text-xl font-bold">นำเข้าข้อมูลต้นไม้จากไฟล์ (PDF/รูปภาพ)</h2>
            </div>
            <button onClick={() => setImportMode(false)} className="text-green-700 hover:text-green-900 font-bold text-sm">
              กลับไปหน้าตาราง
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
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
              {isAnalyzing ? 'กำลังวิเคราะห์...' : 'อัพโหลดไฟล์'}
            </button>
            <span className="text-sm text-gray-500">รองรับไฟล์ PDF หรือรูปภาพตารางข้อมูล</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {pendingData.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-700">รายการที่อ่านได้ ({pendingData.length})</h3>
                <div className="flex gap-3">
                  <button onClick={() => setPendingData(prev => prev.map(p => ({ ...p, verified: true })))} className="text-xs text-green-600 font-bold hover:underline">ยืนยันทั้งหมด</button>
                  <button onClick={() => setPendingData([])} className="text-xs text-red-600 font-bold hover:underline">ล้างทั้งหมด</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[1100px]">
                  <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold">
                    <tr>
                      <th className="px-3 py-3 whitespace-nowrap">Tree Code</th>
                      <th className="px-3 py-3 whitespace-nowrap">แปลง</th>
                      <th className="px-3 py-3 whitespace-nowrap">ชนิดพันธุ์</th>
                      <th className="px-3 py-3 whitespace-nowrap">ต้นที่</th>
                      <th className="px-3 py-3 whitespace-nowrap">แถว</th>
                      <th className="px-3 py-3 whitespace-nowrap">สถานะ</th>
                      <th className="px-3 py-3 whitespace-nowrap text-right">สูง (ม.)</th>
                      <th className="px-3 py-3 whitespace-nowrap text-right">RCD (ซม.)</th>
                      <th className="px-3 py-3 whitespace-nowrap">หมายเหตุ</th>
                      <th className="px-3 py-3 whitespace-nowrap">วันที่</th>
                      <th className="px-3 py-3 whitespace-nowrap">ผู้บันทึก</th>
                      <th className="px-3 py-3 text-center whitespace-nowrap">ยืนยัน</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingData.map((row) => (
                      <tr key={row.id} className={row.verified ? 'bg-green-50' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-2">
                          <input value={row.tree_code} onChange={e => handleUpdatePending(row.id, 'tree_code', e.target.value)}
                            className="w-28 bg-transparent border-b border-transparent focus:border-blue-400 outline-none font-mono text-xs" />
                        </td>
                        <td className="px-3 py-2">
                          <select value={row.plot_code} onChange={e => handleUpdatePending(row.id, 'plot_code', e.target.value)}
                            className="bg-transparent border-b border-transparent focus:border-blue-400 outline-none text-xs w-20">
                            <option value="">—</option>
                            {PLOT_LIST.map(p => <option key={p.code} value={p.code}>{p.code}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select value={row.species_code} onChange={e => {
                              const s = SPECIES_LIST.find(x => x.code === e.target.value);
                              handleUpdatePending(row.id, 'species_code', e.target.value);
                              if (s) handleUpdatePending(row.id, 'species_name', s.name);
                            }}
                            className="bg-transparent border-b border-transparent focus:border-blue-400 outline-none text-xs w-28">
                            <option value="">— เลือก —</option>
                            {SPECIES_LIST.map(s => <option key={s.code} value={s.code}>{s.code} {s.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input value={row.tree_number} onChange={e => handleUpdatePending(row.id, 'tree_number', e.target.value)}
                            className="w-12 bg-transparent border-b border-transparent focus:border-blue-400 outline-none font-mono text-xs text-center" />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <input value={row.row_main} onChange={e => handleUpdatePending(row.id, 'row_main', e.target.value)}
                              placeholder="หลัก" className="w-10 bg-transparent border-b border-transparent focus:border-blue-400 outline-none font-mono text-xs text-center" />
                            <span className="text-gray-400">/</span>
                            <input value={row.row_sub} onChange={e => handleUpdatePending(row.id, 'row_sub', e.target.value)}
                              placeholder="ย่อย" className="w-10 bg-transparent border-b border-transparent focus:border-blue-400 outline-none font-mono text-xs text-center" />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select value={row.status} onChange={e => handleUpdatePending(row.id, 'status', e.target.value)}
                            className="bg-transparent border-b border-transparent focus:border-blue-400 outline-none text-xs">
                            <option value="">—</option>
                            <option value="alive">รอด</option>
                            <option value="dead">ตาย</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input value={row.height_m} onChange={e => handleUpdatePending(row.id, 'height_m', e.target.value)}
                            className="w-16 bg-transparent border-b border-transparent focus:border-blue-400 outline-none font-mono text-xs text-right" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input value={row.dbh_cm} onChange={e => handleUpdatePending(row.id, 'dbh_cm', e.target.value)}
                            className="w-16 bg-transparent border-b border-transparent focus:border-blue-400 outline-none font-mono text-xs text-right" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={row.note} onChange={e => handleUpdatePending(row.id, 'note', e.target.value)}
                            className="w-32 bg-transparent border-b border-transparent focus:border-blue-400 outline-none text-xs" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="date" value={row.survey_date} onChange={e => handleUpdatePending(row.id, 'survey_date', e.target.value)}
                            className="bg-transparent border-b border-transparent focus:border-blue-400 outline-none text-xs w-28" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={row.recorder} onChange={e => handleUpdatePending(row.id, 'recorder', e.target.value)}
                            className="w-20 bg-transparent border-b border-transparent focus:border-blue-400 outline-none text-xs" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.verified ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded-full whitespace-nowrap">
                              <Check size={11} /> ยืนยัน
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-yellow-600 text-xs font-bold bg-yellow-100 px-2 py-1 rounded-full whitespace-nowrap">
                              รอ
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            {row.verified ? (
                              <button onClick={() => handleUnverifyPending(row.id)} className="p-1 text-yellow-500 hover:bg-yellow-100 rounded" title="ยกเลิกการยืนยัน"><X size={15} /></button>
                            ) : (
                              <button onClick={() => handleVerifyPending(row.id)} className="p-1 text-green-600 hover:bg-green-100 rounded" title="ยืนยัน"><Check size={15} /></button>
                            )}
                            <button onClick={() => handleDeletePending(row.id)} className="p-1 text-red-400 hover:bg-red-50 rounded" title="ลบ"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
              <Upload size={48} className="mb-4 opacity-50" />
              <p>อัพโหลดไฟล์เพื่อเริ่มนำเข้าข้อมูลต้นไม้</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3 items-center">
          <span className="text-sm text-gray-500 mr-auto">
            ยืนยันแล้ว: <span className="font-bold text-green-600">{pendingData.filter(p => p.verified).length}</span> / {pendingData.length}
          </span>
          <button onClick={() => setImportMode(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">ยกเลิก</button>
          <button
            onClick={handleSaveVerified}
            disabled={pendingData.filter(p => p.verified).length === 0 || isLoading}
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
    <div className="flex flex-col h-full relative">
      {/* Search and Global Filter Bar */}
      <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-white sticky top-0 z-20">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="ค้นหา code, ชนิด, แปลง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-green-500/20 outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={plotFilter}
            onChange={(e) => setPlotFilter(e.target.value)}
            className="bg-gray-100 border-none rounded-lg px-3 py-2 text-sm flex-1 md:flex-none"
          >
            <option value="">ทุกแปลง</option>
            {PLOT_LIST.map(p => <option key={p.code} value={p.code}>{p.code}</option>)}
          </select>
          {plotFilter && onNavigateToMap && (
            <button
              onClick={() => onNavigateToMap(plotFilter)}
              className="flex items-center gap-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg px-3 py-2 text-sm transition-colors whitespace-nowrap"
              title="ดูแปลงนี้บนแผนที่ดาวเทียม"
            >
              <Map size={15} />
              ดูในแผนที่
            </button>
          )}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-100 border-none rounded-lg px-3 py-2 text-sm flex-1 md:flex-none"
          >
            <option value="">ทุกสถานะ</option>
            <option value="alive">รอด</option>
            <option value="dead">ตาย</option>
          </select>
          <button
            onClick={onCleanDuplicates}
            className="flex items-center gap-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 font-semibold rounded-lg px-3 py-2 text-sm transition-colors whitespace-nowrap"
            title="ล้างข้อมูลซ้ำ"
          >
            <Eraser size={15} />
            ล้างข้อมูลซ้ำ
          </button>
          {onBulkSubmitGrowthLogs && (
            <button
              onClick={() => setImportMode(true)}
              className="flex items-center gap-1.5 bg-green-100 hover:bg-green-200 text-green-700 font-semibold rounded-lg px-3 py-2 text-sm transition-colors whitespace-nowrap"
              title="นำเข้าข้อมูลจากไฟล์ PDF หรือรูปภาพ"
            >
              <Upload size={15} />
              นำเข้าจากไฟล์
            </button>
          )}
        </div>
      </div>

      {/* Dataset Tabs */}
      <div className="px-4 pt-2 bg-white border-b border-gray-200 overflow-x-auto no-scrollbar">
        <div className="flex space-x-1 min-w-max">
          <button
            onClick={() => setActiveDataset('plan')}
            className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all ${
              activeDataset === 'plan'
                ? 'bg-green-700 text-white shadow-sm'
                : 'text-gray-500 hover:text-green-700 hover:bg-gray-100'
            }`}
          >
            ตารางข้อมูลต้นไม้ตามผัง
          </button>
          <button
            onClick={() => setActiveDataset('supp')}
            className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all ${
              activeDataset === 'supp'
                ? 'bg-green-700 text-white shadow-sm'
                : 'text-gray-500 hover:text-green-700 hover:bg-gray-100'
            }`}
          >
            ตารางข้อมูลต้นไม้ปลูกเสริม
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 pt-2 bg-gray-50 border-b border-gray-200 overflow-x-auto no-scrollbar">
        <div className="flex space-x-1 min-w-max">
           {CATEGORIES.map(cat => (
             <button
               key={cat}
               onClick={() => setActiveCategory(cat)}
               className={`px-4 py-2.5 text-sm font-bold rounded-t-lg transition-all flex items-center gap-2 ${
                 activeCategory === cat 
                   ? 'bg-white text-green-700 border-t-2 border-green-600 shadow-sm' 
                   : 'text-gray-500 hover:text-green-600 hover:bg-gray-100'
               }`}
             >
                {cat === 'ไม้ป่า' && <Sprout size={16} />}
                {cat === 'ยางพารา' && <Leaf size={16} />}
                {cat}
             </button>
           ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-800 text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">วันที่ / ผู้บันทึก</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">รหัสแปลง</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">ต้นที่</th>
              <th className="px-4 py-3 whitespace-nowrap">Code / Tag</th>
              <th className="px-4 py-3 whitespace-nowrap">ชนิด</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">หลัก</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">แถว</th>
              <th className="px-4 py-3 whitespace-nowrap">สถานะ</th>
              
              {/* Dynamic Columns based on Category */}
              {(activeCategory === 'ไม้ป่า' || activeCategory === 'ยางพารา' || activeCategory === 'ไม้ผล') && (
                <>
                  <th className="px-4 py-3 text-right whitespace-nowrap">RCD (ซม.)</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">สูง (ม.)</th>
                </>
              )}

              {activeCategory === 'ผลผลิตไผ่' && (
                <>
                  <th className="px-4 py-3 text-right whitespace-nowrap">จำนวน (ลำ)</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">RCD 1 (ซม.)</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">RCD 2 (ซม.)</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">RCD 3 (ซม.)</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">สูง (ม.)</th>
                </>
              )}

              {activeCategory === 'กล้วย' && (
                <>
                  <th className="px-4 py-3 text-right whitespace-nowrap">ต้นรวม</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">ต้น 1 ปี</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">สูง (ม.)</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">เครือ</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">หวี</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">ราคา/หวี</th>
                </>
              )}

              <th className="px-4 py-3 text-center whitespace-nowrap">ดอก/ผล</th>
              <th className="px-4 py-3 whitespace-nowrap">หมายเหตุ</th>
              <th className="px-4 py-3 text-center bg-gray-900 whitespace-nowrap">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((r, i) => {
                return (
                  <tr key={r.log_id || i} className={`hover:bg-green-50/50 transition-colors group ${editLogId === r.log_id ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                       <div>{r.survey_date}</div>
                       <div className="text-[10px] text-gray-400">{r.recorder}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm font-bold text-green-700">
                       {r.plot_code}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm font-bold">
                       {/* Extract last 3 digits from tree_code if tree_number is missing or 0 */}
                       {r.tree_number || parseInt(r.tree_code.slice(-3), 10)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                       <div className="font-mono text-sm font-bold text-green-800">{r.tree_code}</div>
                       <div className="text-[10px] text-gray-500 font-mono">{r.tag_label}</div>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${r.species_group === 'A' ? 'bg-green-600' : 'bg-orange-600'}`}></span>
                      {r.species_name}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm">{r.row_main || '-'}</td>
                    <td className="px-4 py-3 text-center font-mono text-sm">{r.row_sub || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                        r.status === 'alive' ? 'bg-green-100 text-green-700' : 
                        r.status === 'dead' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {r.status === 'alive' ? 'รอด' : r.status === 'dead' ? 'ตาย' : '—'}
                      </span>
                    </td>

                    {/* Dynamic Row Data */}
                    {(activeCategory === 'ไม้ป่า' || activeCategory === 'ยางพารา' || activeCategory === 'ไม้ผล') && (
                      <>
                        <td className="px-4 py-3 text-right font-mono text-sm">{r.dbh_cm || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">{r.height_m || '-'}</td>
                      </>
                    )}

                    {activeCategory === 'ผลผลิตไผ่' && (
                      <>
                        <td className="px-4 py-3 text-right font-mono text-sm font-bold">{r.bamboo_culms || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-gray-600">{r.dbh_1_cm || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-gray-600">{r.dbh_2_cm || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-gray-600">{r.dbh_3_cm || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">{r.height_m || '-'}</td>
                      </>
                    )}

                    {activeCategory === 'กล้วย' && (
                      <>
                        <td className="px-4 py-3 text-right font-mono text-sm">{r.banana_total || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">{r.banana_1yr || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">{r.height_m || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">{r.yield_bunches || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">{r.yield_hands || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-green-700 font-bold">{r.price_per_hand || '-'}</td>
                      </>
                    )}
                    
                    <td className="px-4 py-3 text-center">
                       {r.flowering === 'yes' ? '🌸' : <span className="text-gray-200">•</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[150px]" title={r.note}>{r.note}</td>
                    
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => onEdit(r)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
                          title="แก้ไข"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={() => onDelete(r)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                          title="ลบข้อมูล"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={15} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    {isLoading ? (
                       <Loader2 size={48} className="animate-spin text-green-600" />
                    ) : (
                       <>
                          <Search size={48} strokeWidth={1} />
                          <p>ไม่พบข้อมูลในกลุ่ม {activeCategory}</p>
                       </>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile FAB to Add Tree */}
      <button 
        onClick={() => { onClearForm(); onOpenMobileForm(); }}
        className="md:hidden absolute bottom-6 right-6 w-14 h-14 bg-[#2d5a27] text-white rounded-full shadow-lg flex items-center justify-center z-30 hover:bg-green-800 transition-colors"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default TableView;
