
import React, { useMemo } from 'react';
import { Pencil, Plus, X, Save, Loader2, Leaf } from 'lucide-react';
import { PLOT_LIST, SPECIES_LIST } from '../constants';
import { GrowthFormData } from '../types';
import { getCategoryFromInfo, getCategoryColor } from '../utils/classification';

interface GrowthFormProps {
  formData: GrowthFormData;
  setFormData: (data: GrowthFormData) => void;
  editLogId: string | null;
  isLoading: boolean;
  isMobileOpen: boolean;
  isDesktopOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onClear: () => void;
  treeCodePreview: string;
  tagLabelPreview: string;
}

const GrowthForm: React.FC<GrowthFormProps> = ({
  formData,
  setFormData,
  editLogId,
  isLoading,
  isMobileOpen,
  isDesktopOpen,
  onClose,
  onSubmit,
  onClear,
  treeCodePreview,
  tagLabelPreview
}) => {
  const handleChange = (field: keyof GrowthFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  // Determine Category based on selected species
  const currentCategory = useMemo(() => {
    const species = SPECIES_LIST.find(s => s.code === formData.speciesCode);
    return species ? getCategoryFromInfo(species) : null;
  }, [formData.speciesCode]);

  return (
    <div className={`
      bg-white flex flex-col overflow-y-auto shrink-0 shadow-lg border-r border-gray-200 transition-all duration-300 ease-in-out
      /* Mobile: Fixed Modal */
      fixed inset-0 z-[2000] w-full h-full transform
      ${isMobileOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}
      
      /* Desktop: Collapsible Sidebar */
      md:relative md:z-0 md:transform-none md:pointer-events-auto md:h-full md:translate-y-0
      ${isDesktopOpen ? 'md:w-96 md:opacity-100 md:translate-x-0' : 'md:w-0 md:opacity-0 md:-translate-x-full md:overflow-hidden'}
    `}>
      <div className="md:w-96 shrink-0 h-full flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-[#2d5a27] text-white shadow-md sticky top-0 z-10 shrink-0">
          <h3 className="font-bold flex items-center gap-2">
             {editLogId ? <Pencil size={18} /> : <Plus size={18} />}
             {editLogId ? 'แก้ไขข้อมูลต้นไม้' : 'บันทึกต้นไม้ใหม่'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20">
            <X size={24} />
          </button>
        </div>

        {/* --- PART 1: IDENTIFICATION --- */}
        <div className={`p-4 border-b ${editLogId ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
          <h3 className={`hidden md:flex text-xs font-bold uppercase tracking-widest mb-4 items-center justify-between ${editLogId ? 'text-amber-700' : 'text-gray-400'}`}>
            <span>📍 ข้อมูลแปลงและต้นไม้</span>
            {editLogId && (
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                <Pencil size={10} /> กำลังแก้ไข
              </span>
            )}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">แปลง</label>
              <select 
                value={formData.plotCode} 
                onChange={(e) => handleChange('plotCode', e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none"
              >
                <option value="">— เลือกแปลง —</option>
                {PLOT_LIST.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">ต้นที่</label>
              <input 
                type="number" 
                value={formData.treeNumber}
                onChange={(e) => handleChange('treeNumber', e.target.value)}
                placeholder="เช่น 14"
                className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm font-mono focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none" 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">ชนิดพันธุ์</label>
              <select 
                value={formData.speciesCode} 
                onChange={(e) => handleChange('speciesCode', e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none"
              >
                <option value="">— เลือกพันธุ์ไม้ —</option>
                <optgroup label="🌲 ไม้ป่า (A)">
                  {SPECIES_LIST.filter(s => s.group === 'A').map(s => <option key={s.code} value={s.code}>{s.code} {s.name}</option>)}
                </optgroup>
                <optgroup label="🍎 ไม้ผล (B)">
                  {SPECIES_LIST.filter(s => s.group === 'B').map(s => <option key={s.code} value={s.code}>{s.code} {s.name}</option>)}
                </optgroup>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">หลัก (Row)</label>
              <input 
                type="text" 
                value={formData.rowMain}
                onChange={(e) => handleChange('rowMain', e.target.value)}
                placeholder="02"
                className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm font-mono" 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">แถว (Sub)</label>
              <input 
                type="text" 
                value={formData.rowSub}
                onChange={(e) => handleChange('rowSub', e.target.value)}
                placeholder="03-A"
                className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm font-mono" 
              />
            </div>
          </div>

          {/* Auto IDs Preview */}
          <div className="mt-4 p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
             <div className="flex justify-between items-center mb-1">
               <span className="text-[10px] font-bold text-gray-500 uppercase">Tree Code</span>
               <span className="font-mono text-sm font-bold text-gray-700">{treeCodePreview}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-[10px] font-bold text-gray-500 uppercase">Tag</span>
               <span className="text-xs text-gray-600 truncate max-w-[200px]">{tagLabelPreview}</span>
             </div>
          </div>
        </div>

        {/* --- PART 2: DYNAMIC MEASUREMENTS --- */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">📏 ข้อมูลการเติบโต</h3>
            {currentCategory && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryColor(currentCategory)}`}>
                {currentCategory}
              </span>
            )}
          </div>

            {/* Common: Status */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">สถานะ</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleChange('status', 'alive')}
                  className={`py-2 text-sm font-bold rounded-md border-2 transition-all ${
                    formData.status === 'alive' ? 'bg-green-100 border-green-600 text-green-700' : 'bg-white border-gray-200 text-gray-400 hover:border-green-400'
                  }`}
                >
                  ✅ รอด
                </button>
                <button 
                  onClick={() => handleChange('status', 'dead')}
                  className={`py-2 text-sm font-bold rounded-md border-2 transition-all ${
                    formData.status === 'dead' ? 'bg-red-100 border-red-600 text-red-700' : 'bg-white border-gray-200 text-gray-400 hover:border-red-400'
                  }`}
                >
                  ❌ ตาย
                </button>
              </div>
            </div>

            {/* DYNAMIC FORM FIELDS - Only show if ALIVE or Status not selected (default) */}
            {(formData.status !== 'dead') && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                
                {/* Case 1: Bamboo (ไผ่) */}
                {currentCategory === 'ผลผลิตไผ่' && (
                  <>
                     <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500">จำนวนลำ (ลำ)</label>
                        <input type="number" value={formData.bambooCulms} onChange={e => handleChange('bambooCulms', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" placeholder="0" />
                     </div>
                     <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-gray-500">RCD 1 (ซม.)</label>
                          <input type="number" step="0.1" value={formData.dbh1Cm} onChange={e => handleChange('dbh1Cm', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-gray-500">RCD 2 (ซม.)</label>
                          <input type="number" step="0.1" value={formData.dbh2Cm} onChange={e => handleChange('dbh2Cm', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-gray-500">RCD 3 (ซม.)</label>
                          <input type="number" step="0.1" value={formData.dbh3Cm} onChange={e => handleChange('dbh3Cm', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" />
                        </div>
                     </div>
                     <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500">ความสูง (ม.)</label>
                        <input type="number" step="0.1" value={formData.heightM} onChange={e => handleChange('heightM', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" />
                     </div>
                  </>
                )}

                {/* Case 2: Banana (กล้วย) */}
                {currentCategory === 'กล้วย' && (
                  <>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-500">จำนวนต้นทั้งหมด</label>
                          <input type="number" value={formData.bananaTotal} onChange={e => handleChange('bananaTotal', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-500">จำนวนต้น 1 ปี</label>
                          <input type="number" value={formData.banana1yr} onChange={e => handleChange('banana1yr', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" />
                        </div>
                     </div>
                     <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500">สูงต้นที่สูงที่สุด (ม.)</label>
                        <input type="number" step="0.1" value={formData.heightM} onChange={e => handleChange('heightM', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-500">ผลผลิต (เครือ)</label>
                          <input type="number" value={formData.yieldBunches} onChange={e => handleChange('yieldBunches', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-gray-500">ผลผลิต (หวี)</label>
                          <input type="number" value={formData.yieldHands} onChange={e => handleChange('yieldHands', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" />
                        </div>
                     </div>
                     <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500">ราคา/หวี (บาท)</label>
                        <input type="number" value={formData.pricePerHand} onChange={e => handleChange('pricePerHand', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" />
                     </div>
                  </>
                )}

                {/* Case 3: Standard (Forest, Rubber, Fruit) */}
                {(!currentCategory || ['ไม้ป่า', 'ยางพารา', 'ไม้ผล'].includes(currentCategory)) && (
                   <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-500">RCD (ซม.)</label>
                      <input type="number" step="0.1" value={formData.dbhCm} onChange={(e) => handleChange('dbhCm', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" placeholder="0.0" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-500">สูง (ม.)</label>
                      <input type="number" step="0.1" value={formData.heightM} onChange={(e) => handleChange('heightM', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" placeholder="0.0" />
                    </div>
                   </div>
                )}

                {/* Common: Flowering Status (Applies to all except maybe Banana, but can keep generic) */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500">การติดดอกออกผล</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleChange('flowering', 'yes')}
                      className={`py-2 text-sm font-bold rounded-md border transition-all ${
                        formData.flowering === 'yes' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-white border-gray-200 text-gray-400'
                      }`}
                    >
                      🌸 มี
                    </button>
                    <button 
                      onClick={() => handleChange('flowering', 'no')}
                      className={`py-2 text-sm font-bold rounded-md border transition-all ${
                        formData.flowering === 'no' ? 'bg-gray-200 border-gray-400 text-gray-700' : 'bg-white border-gray-200 text-gray-400'
                      }`}
                    >
                      ไม่มี
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">หมายเหตุ</label>
              <input type="text" value={formData.note} onChange={(e) => handleChange('note', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 w-full" placeholder="(ถ้ามี)" />
            </div>

        </div>

        {/* --- PART 3: SUBMIT --- */}
        <div className="p-5 bg-gray-50/50 flex-1 pb-20 md:pb-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">📅 บันทึกข้อมูล</h3>
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">วันที่สำรวจ</label>
              <input type="date" value={formData.surveyDate} onChange={(e) => handleChange('surveyDate', e.target.value)} className="bg-white border border-gray-200 rounded-md p-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">ผู้บันทึก</label>
              <input type="text" value={formData.recorder} onChange={(e) => handleChange('recorder', e.target.value)} placeholder="ชื่อผู้บันทึก" className="bg-white border border-gray-200 rounded-md p-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClear} className="px-4 py-3 text-sm font-bold text-gray-500 hover:text-red-600 transition-colors">
              {editLogId ? 'ยกเลิก' : 'ล้างฟอร์ม'}
            </button>
            <button onClick={onSubmit} disabled={isLoading} className={`flex-1 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${editLogId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2d5a27] hover:bg-green-800'}`}>
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : editLogId ? <Save size={18} /> : <Plus size={18} />}
              {editLogId ? 'อัปเดต' : 'บันทึก'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrowthForm;
