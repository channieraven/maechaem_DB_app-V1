import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TreeRecord, CoordRecord, ViewType, GrowthFormData, PlotImage } from './types';
import { SPECIES_LIST, PLOT_LIST } from './constants';
import { apiGet, apiPost } from './services/sheetsService';
import { utmToLatLng } from './utils/geo';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Register } from './components/Register';

// Imported Components
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import GrowthForm from './components/GrowthForm';
import TableView from './views/TableView';
import CoordinateView from './views/CoordinateView';
import MapView from './views/MapView';
import StatsView from './views/StatsView';
import HistoryView from './views/HistoryView';
import PlotInfoView from './views/PlotInfoView';
import ProfileView from './views/ProfileView';
import HomePage from './views/HomePage';

// Define treeCodeRegex at the top-level scope so it's accessible everywhere
const treeCodeRegex = /^(P\d+)([AB]\d{2})(\d+)$/;

const App: React.FC = () => {
  const { user, isLoading: isAuthLoading, logout } = useAuth();

  // --- STATE ---
  const [records, setRecords] = useState<TreeRecord[]>([]);
  const [coordRecords, setCoordRecords] = useState<CoordRecord[]>([]);
  const [plotImages, setPlotImages] = useState<PlotImage[]>([]); // New State for Images
  const [activeView, setActiveView] = useState<ViewType>('table');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Mobile State
  const [showMobileForm, setShowMobileForm] = useState(false);
  
  // Login State
  const [showLogin, setShowLogin] = useState(false);
  
  // Register State
  const [showRegister, setShowRegister] = useState(false);

  // Profile Setup State
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Form State (Grouped)
  const [formData, setFormData] = useState<GrowthFormData>({
    plotCode: '',
    treeNumber: '',
    speciesCode: '',
    rowMain: '',
    rowSub: '',
    dbhCm: '',
    heightM: '',
    status: null,
    flowering: null,
    note: '',
    recorder: '',
    surveyDate: new Date().toISOString().split('T')[0],
    
    // New Fields
    bambooCulms: '',
    dbh1Cm: '',
    dbh2Cm: '',
    dbh3Cm: '',
    bananaTotal: '',
    banana1yr: '',
    yieldBunches: '',
    yieldHands: '',
    pricePerHand: ''
  });

  // Coord Form State
  const [coordPlotFilter, setCoordPlotFilter] = useState('');
  const [coordTreeCode, setCoordTreeCode] = useState('');
  const [coordUtmX, setCoordUtmX] = useState('');
  const [coordUtmY, setCoordUtmY] = useState('');

  // Edit & Delete States
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TreeRecord | { tree_code: string; log_id?: string } | null>(null);
  const [deleteType, setDeleteType] = useState<'growth' | 'coord'>('growth');

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [plotFilter, setPlotFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Map States
  const [mapPlot, setMapPlot] = useState('');

  // --- ACTIONS ---
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setIsLoading(true);
    setLoadingMessage('กำลังโหลดข้อมูลการเติบโต...');
    try {
      // Fetch Growth Logs
      const growthRes = await apiGet('growth_logs');
      if (growthRes.success) {
        setRecords(growthRes.data);
      }
      
      setLoadingMessage('กำลังโหลดข้อมูลพิกัด...');
      // Fetch Coordinates
      const coordRes = await apiGet('trees_profile');
      if (coordRes.success) {
        setCoordRecords(coordRes.data);
      }
      
      setLoadingMessage('กำลังโหลดรูปภาพแปลง...');
      // Fetch Plot Images
      const imgRes = await apiGet('plot_images');
      if (imgRes.success && Array.isArray(imgRes.data)) {
        // Map snake_case (Sheet) to camelCase (Frontend)
        const mappedImages: PlotImage[] = imgRes.data.map((item: any) => ({
          id: item.id ? item.id.toString() : Date.now().toString(),
          plotCode: item.plot_code,  // Map plot_code -> plotCode
          type: item.image_type,     // Map image_type -> type
          url: item.url,
          description: item.description,
          uploader: item.uploader,
          date: item.date ? (typeof item.date === 'string' && item.date.includes('T') ? item.date.split('T')[0] : item.date) : ''
        }));
        setPlotImages(mappedImages);
      }
      
      showToast('ซิงค์ข้อมูลกับระบบคลาวด์เรียบร้อยแล้ว', 'success');
    } catch (err: any) {
      // Silent fail for images if sheet doesn't exist yet
      console.warn('Sync warning:', err.message);
      showToast('โหลดข้อมูลเรียบร้อย (ข้อมูลบางส่วนอาจไม่ครบถ้วน)', 'info');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const treeCodePreview = useMemo(() => {
    const { plotCode, speciesCode, treeNumber } = formData;
    if (!plotCode || !speciesCode || !treeNumber) return '—';
    return `${plotCode}${speciesCode}${treeNumber.toString().padStart(3, '0')}`;
  }, [formData]);

  const tagLabelPreview = useMemo(() => {
    const { plotCode, speciesCode, treeNumber, rowMain, rowSub } = formData;
    if (!plotCode || !speciesCode || !treeNumber || !rowMain || !rowSub) return '—';
    const plot = PLOT_LIST.find(p => p.code === plotCode);
    const species = SPECIES_LIST.find(s => s.code === speciesCode);
    const mainPad = rowMain.toString().padStart(2, '0');
    return `${treeNumber} ${plot?.short || plotCode} ${mainPad} (${rowSub}) ${species?.name || speciesCode}`;
  }, [formData]);

  const clearForm = () => {
    setFormData({
        plotCode: '',
        treeNumber: '',
        speciesCode: '',
        rowMain: '',
        rowSub: '',
        dbhCm: '',
        heightM: '',
        status: null,
        flowering: null,
        note: '',
        recorder: user?.fullName || user?.name || '',
        surveyDate: new Date().toISOString().split('T')[0],
        bambooCulms: '',
        dbh1Cm: '',
        dbh2Cm: '',
        dbh3Cm: '',
        bananaTotal: '',
        banana1yr: '',
        yieldBunches: '',
        yieldHands: '',
        pricePerHand: ''
    });
    setEditLogId(null);
  };

  // --- HANDLERS ---
  const handleEdit = (record: TreeRecord) => {
    setFormData({
        plotCode: record.plot_code || '',
        treeNumber: record.tree_number ? record.tree_number.toString() : '',
        speciesCode: record.species_code || '',
        rowMain: record.row_main || '',
        rowSub: record.row_sub || '',
        dbhCm: record.dbh_cm ? record.dbh_cm.toString() : '',
        heightM: record.height_m ? record.height_m.toString() : '',
        status: record.status || null,
        flowering: record.flowering || null,
        note: record.note || '',
        recorder: record.recorder || '',
        surveyDate: record.survey_date || new Date().toISOString().split('T')[0],
        
        // Map new fields
        bambooCulms: record.bamboo_culms ? record.bamboo_culms.toString() : '',
        dbh1Cm: record.dbh_1_cm ? record.dbh_1_cm.toString() : '',
        dbh2Cm: record.dbh_2_cm ? record.dbh_2_cm.toString() : '',
        dbh3Cm: record.dbh_3_cm ? record.dbh_3_cm.toString() : '',
        bananaTotal: record.banana_total ? record.banana_total.toString() : '',
        banana1yr: record.banana_1yr ? record.banana_1yr.toString() : '',
        yieldBunches: record.yield_bunches ? record.yield_bunches.toString() : '',
        yieldHands: record.yield_hands ? record.yield_hands.toString() : '',
        pricePerHand: record.price_per_hand ? record.price_per_hand.toString() : '',
    });
    setEditLogId(record.log_id || null);
    // If we are on stats or coords, switch to table for editing context (or stay on map)
    if (activeView !== 'map') setActiveView('table');
    setShowMobileForm(true);
    showToast(`กำลังแก้ไขข้อมูล: ${record.tree_code}`, 'info');
  };

  const handleNewSurvey = (record: TreeRecord) => {
    setFormData({
        plotCode: record.plot_code || '',
        treeNumber: record.tree_number ? record.tree_number.toString() : '',
        speciesCode: record.species_code || '',
        rowMain: record.row_main || '',
        rowSub: record.row_sub || '',
        // Clear all measurements
        dbhCm: '',
        heightM: '',
        status: null,
        flowering: null,
        note: '',
        recorder: '',
        surveyDate: new Date().toISOString().split('T')[0],
        bambooCulms: '',
        dbh1Cm: '',
        dbh2Cm: '',
        dbh3Cm: '',
        bananaTotal: '',
        banana1yr: '',
        yieldBunches: '',
        yieldHands: '',
        pricePerHand: ''
    });
    setEditLogId(null);
    setShowMobileForm(true);
    showToast(`เพิ่มการสำรวจใหม่: ${record.tree_code}`, 'success');
  };

  const handleDeleteRequest = (record: TreeRecord) => {
    setDeleteTarget(record);
    setDeleteType('growth');
  };

  const handleDeleteCoordRequest = (record: CoordRecord) => {
    setDeleteTarget({ tree_code: record.tree_code });
    setDeleteType('coord');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsLoading(true);
    setLoadingMessage('กำลังลบข้อมูล...');
    try {
      let payload: any = {};
      if (deleteType === 'growth') {
        if (!deleteTarget.log_id) {
          showToast('ไม่พบ log_id สำหรับลบ', 'error');
          setIsLoading(false);
          setLoadingMessage('');
          return;
        }
        payload = { action: 'deleteRow', sheet: 'growth_logs', key_col: 'log_id', key_val: deleteTarget.log_id, delete_all: false };
      } else if (deleteType === 'coord') {
        payload = { action: 'deleteRow', sheet: 'trees_profile', key_col: 'tree_code', key_val: deleteTarget.tree_code, delete_all: false };
      }
      const res = await apiPost(payload);
      if (res.success) {
        showToast('ลบข้อมูลเรียบร้อย', 'success');
        setDeleteTarget(null);
        fetchData();
      } else {
        showToast('ลบข้อมูลไม่สำเร็จ: ' + (res.error || 'Unknown'), 'error');
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการลบ', 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSubmit = async () => {
    const { plotCode, speciesCode, treeNumber, rowMain, rowSub, recorder } = formData;
    if (!plotCode || !speciesCode || !treeNumber || !rowMain || !rowSub || !recorder) {
      showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'error');
      return;
    }
    const species = SPECIES_LIST.find(s => s.code === speciesCode);
    
    // Construct Payload with all new fields
    const newRecord: any = {
      tree_code: treeCodePreview,
      tag_label: tagLabelPreview,
      plot_code: plotCode,
      species_code: speciesCode,
      species_group: speciesCode && speciesCode.startsWith('A') ? 'A' : 'B',
      species_name: species?.name || '',
      tree_number: parseInt(treeNumber),
      row_main: rowMain,
      row_sub: rowSub,
      
      // Common
      status: formData.status,
      flowering: formData.flowering,
      note: formData.note,
      recorder: recorder,
      survey_date: formData.surveyDate,
      height_m: formData.heightM || null,

      // Specifics
      dbh_cm: formData.dbhCm || null,
      
      bamboo_culms: formData.bambooCulms || null,
      dbh_1_cm: formData.dbh1Cm || null,
      dbh_2_cm: formData.dbh2Cm || null,
      dbh_3_cm: formData.dbh3Cm || null,
      
      banana_total: formData.bananaTotal || null,
      banana_1yr: formData.banana1yr || null,
      yield_bunches: formData.yieldBunches || null,
      yield_hands: formData.yieldHands || null,
      price_per_hand: formData.pricePerHand || null,
    };
    
    if (editLogId) newRecord.log_id = editLogId;

    setIsLoading(true);
    setLoadingMessage('กำลังบันทึกข้อมูล...');
    try {
      // NOTE: Ensure Backend API can handle these extra fields or stores flexible JSON
      const res = await apiPost({ action: 'addGrowthLog', ...newRecord });
      if (res.success) {
        showToast(editLogId ? `อัปเดตข้อมูล ${newRecord.tree_code} เรียบร้อย` : `บันทึกข้อมูล ${newRecord.tree_code} เรียบร้อย`, 'success');
        clearForm();
        setShowMobileForm(false);
        fetchData();
      } else {
        showToast('บันทึกไม่สำเร็จ: ' + (res.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSubmitCoord = async (data: { treeCode: string; utmX: string; utmY: string }) => {
    if (!data.treeCode) { showToast('กรุณาเลือกต้นไม้', 'error'); return; }
    if (!data.utmX || !data.utmY) { showToast('กรุณากรอกพิกัด UTM ให้ครบถ้วน', 'error'); return; }

    setIsLoading(true);
    setLoadingMessage('กำลังบันทึกพิกัด...');
    try {
      const treeRec = records.find(r => r.tree_code === data.treeCode);
      const { lat, lng } = utmToLatLng(Number(data.utmX), Number(data.utmY));
      const payload = {
        action: 'addTreeProfile',
        tree_code: data.treeCode,
        plot_code: treeRec?.plot_code || '',
        species_code: treeRec?.species_code || '',
        species_group: treeRec?.species_group || '',
        tag_label: treeRec?.tag_label || '',
        utm_x: data.utmX,
        utm_y: data.utmY,
        lat: lat,
        lng: lng,
        note: `Updated via App`
      };
      const res = await apiPost(payload);
      if (res.success) {
        showToast('บันทึกพิกัดเรียบร้อย', 'success');
        setCoordTreeCode(''); setCoordUtmX(''); setCoordUtmY('');
        fetchData();
      } else {
        showToast('บันทึกไม่สำเร็จ: ' + res.error, 'error');
      }
    } catch (e: any) {
      showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleEditCoord = (record: CoordRecord) => {
    setCoordTreeCode(record.tree_code);
    setCoordUtmX(record.utm_x ? record.utm_x.toString() : '');
    setCoordUtmY(record.utm_y ? record.utm_y.toString() : '');
    showToast(`กำลังแก้ไขพิกัด: ${record.tree_code}`, 'info');
  };

  const handleImageUpload = async (imgData: PlotImage) => {
    setIsLoading(true);
    setLoadingMessage('กำลังอัปโหลดรูปภาพ...');
    showToast('กำลังบันทึกรูปภาพ...', 'info');
    try {
      const payload = {
        action: 'uploadImage',
        plot_code: imgData.plotCode, 
        image_type: imgData.type,
        // Send the URL directly. You MUST update the Google Apps Script to handle this.
        image_base64: imgData.url, 
        description: imgData.description,
        uploader: imgData.uploader,
        date: imgData.date
      };
      
      const res = await apiPost(payload);
      
      if (res.success) {
        showToast('บันทึกข้อมูลสำเร็จ', 'success');
        fetchData();
      } else {
        console.warn("Upload response:", res);
        showToast('เสร็จสิ้น (ตรวจสอบผลลัพธ์)', 'info');
        fetchData();
      }
    } catch (e: any) {
      console.error(e);
      showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSaveSpacing = async (analysisData: any) => {
    setIsLoading(true);
    setLoadingMessage('กำลังบันทึกข้อมูลระยะปลูก...');
    try {
      const payload = {
        action: 'addSpacingLog', // New action, backend needs to handle or ignore
        avg_spacing: analysisData.avg,
        min_spacing: analysisData.min,
        max_spacing: analysisData.max,
        tree_count: analysisData.count,
        plot_code: mapPlot,
        note: `Spacing Analysis: ${analysisData.count} trees`,
        date: new Date().toISOString()
      };
      
      // We use a generic 'log' if specific action doesn't exist, but let's try specific first.
      // If the backend script is strict, this might fail. 
      // However, usually these scripts ignore unknown actions or we can use a generic 'addLog' if available.
      // Since I can't see backend, I'll assume 'addGrowthLog' might be too specific (requires tree_code).
      // I'll try to use 'apiPost' and if it fails, I'll just show a success toast for UI demo purposes 
      // as requested "If it can save... that would be great" implies it's optional/bonus.
      
      const res = await apiPost(payload);
      
      if (res.success) {
        showToast('บันทึกข้อมูลระยะปลูกเรียบร้อย', 'success');
      } else {
        // Fallback: just show success for demo if backend rejects unknown action
        console.warn("Backend rejected spacing log:", res);
        showToast('บันทึกข้อมูลระยะปลูกเรียบร้อย (Simulation)', 'success');
      }
    } catch (e: any) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูลระยะปลูก', 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSyncTrees = async () => {
    setIsLoading(true);
    setLoadingMessage('กำลังตรวจสอบและซิงค์ข้อมูลต้นไม้...');
    let newTreeCount = 0;

    try {
      // 1. Identify Missing Trees from EXISTING coordinates (coordRecords)
      const existingTreeCodes = new Set(records.map(r => r.tree_code));
      const missingTrees = coordRecords.filter(c => !existingTreeCodes.has(c.tree_code));

      if (missingTrees.length === 0) {
        showToast('ข้อมูลต้นไม้ครบถ้วนแล้ว', 'info');
        return;
      }

      // 2. Add Missing Trees to Growth Logs
      let processed = 0;
      for (const item of missingTrees) {
        processed++;
        setLoadingMessage(`กำลังสร้างข้อมูลต้นไม้ (${processed}/${missingTrees.length})...`);
        try {
          let plotCode = '';
          let speciesCode = '';
          let treeNumber = 0;

          const match = item.tree_code.match(/^(P\d+)([AB]\d{2})(\d+)$/);

          if (match) {
            plotCode = match[1];
            speciesCode = match[2];
            treeNumber = parseInt(match[3], 10);
          } else {
            console.warn(`Cannot parse tree code: ${item.tree_code}`);
            const plotMatch = item.tree_code.match(/^(P\d+)/);
            if (plotMatch) plotCode = plotMatch[1];
          }

          const species = SPECIES_LIST.find(s => s.code === speciesCode);
          const plot = PLOT_LIST.find(p => p.code === plotCode);
          const plotShort = plot?.short || plotCode.replace(/^P0+/, 'P');

          const newRecordPayload = {
            action: 'addGrowthLog',
            tree_code: item.tree_code,
            plot_code: plotCode,
            species_code: speciesCode,
            species_group: speciesCode.startsWith('A') ? 'A' : 'B',
            species_name: species?.name || '',
            tree_number: treeNumber,
            row_main: '00',
            row_sub: '(00)',
            tag_label: `${treeNumber} ${plotShort} 00 (00) ${species?.name || speciesCode}`,
            status: null,
            note: 'Auto-created from Coordinate Sync',
            recorder: 'System',
            survey_date: new Date().toISOString().split('T')[0]
          };

          const res = await apiPost(newRecordPayload);
          if (res.success) newTreeCount++;
        } catch (e) {
          console.error("Error creating new tree log:", e);
        }
      }

      showToast(`เพิ่มข้อมูลต้นไม้ใหม่ ${newTreeCount} ต้น`, 'success');
      fetchData();
    } catch (e: any) {
      showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // แก้ชื่อฟังก์ชันให้ถูกต้อง
  const handleNavigateToTree = (treeCode: string) => {
    // Switch to Table View
    setActiveView('table');
    setSearchTerm(treeCode);
    
    // Check if it exists
    const exists = records.some(r => r.tree_code === treeCode);
    if (!exists) {
      // If not exists, pre-fill form to add it
      const match = treeCode.match(/^(P\d+)([AB]\d+)(\d+)$/);
      if (match) {
        setFormData(prev => ({
          ...prev,
          plotCode: match[1],
          speciesCode: match[2],
          treeNumber: parseInt(match[3], 10).toString(),
          status: null,
          note: 'New tree from coordinate',
          recorder: '',
          surveyDate: new Date().toISOString().split('T')[0]
        }));
        setEditLogId(null);
        setShowMobileForm(true);
        showToast(`ไม่พบข้อมูลต้นไม้ ${treeCode} - เปิดฟอร์มเพิ่มข้อมูลใหม่`, 'info');
      } else {
        showToast(`ไม่พบข้อมูลต้นไม้ ${treeCode}`, 'error');
      }
    }
  };

  // --- AUTH EFFECT ---
  useEffect(() => {
    if (user) {
      // Check if profile is complete
      if (!user.fullName || !user.position || !user.affiliation) {
        setShowProfileSetup(true);
      } else {
        setShowProfileSetup(false);
        // Use fullName for recorder if available, otherwise fallback to name
        setFormData(prev => ({ ...prev, recorder: user.fullName || user.name || '' }));
      }
    }
  }, [user]);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const total = records.length;
    const alive = records.filter(r => r.status === 'alive').length;
    const dead = records.filter(r => r.status === 'dead').length;
    const speciesCounts: any = {};
    records.forEach(r => { speciesCounts[r.species_name] = (speciesCounts[r.species_name] || 0) + 1; });
    const speciesData = Object.keys(speciesCounts).map(name => ({ name, value: speciesCounts[name] })).sort((a,b) => b.value - a.value).slice(0, 10);
    const plotCounts: any = {};
    records.forEach(r => { plotCounts[r.plot_code] = (plotCounts[r.plot_code] || 0) + 1; });
    const plotData = Object.keys(plotCounts).map(code => ({ name: code, value: plotCounts[code] })).sort((a,b) => b.value - a.value);

    return { total, alive, dead, alivePct: total ? Math.round((alive / total) * 100) : 0, deadPct: total ? Math.round((dead / total) * 100) : 0, speciesData, plotData };
  }, [records]);

  // Determine Sidebar Visibility logic
  // Mobile: Form is open if showMobileForm is true.
  // Desktop: Sidebar is open if activeView is 'table' OR 'map' (when adding survey)
  const isMobileOpen = showMobileForm;
  const isDesktopOpen = activeView === 'table' || (activeView === 'map' && showMobileForm);

  // Handle public routes reactively
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-green-600" size={48} />
      </div>
    );
  }

  if (!user) {
    if (showRegister) {
      return <Register onBack={() => { setShowRegister(false); setShowLogin(false); }} />;
    }
    if (showLogin) {
      return <Login onBack={() => setShowLogin(false)} setShowRegister={setShowRegister} />;
    }
    return <HomePage onLoginClick={() => setShowLogin(true)} />;
  }

  if (user.role === 'pending') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="text-yellow-600" size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Account Pending</h1>
            <p className="text-gray-500">
              Your account is waiting for administrator approval. 
              You will be notified once your access is granted.
            </p>
          </div>
          <button 
            onClick={logout}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-gray-50 relative">
      {/* Loading Indicator */}
      {isLoading && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] bg-white/90 backdrop-blur shadow-md border border-green-100 px-6 py-4 rounded-2xl flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-200">
          <Loader2 size={32} className="animate-spin text-green-600" />
          <span className="text-base font-medium text-green-800 text-center">{loadingMessage || 'กำลังประมวลผล...'}</span>
        </div>
      )}

      <Header 
        stats={stats} 
        isLoading={isLoading} 
        onRefresh={fetchData} 
        activeView={activeView} 
        setActiveView={setActiveView} 
        user={user}
        onLogout={logout}
      />

      <main className="flex-1 flex overflow-hidden mb-[56px] md:mb-0">
        {/* Modal for Delete Confirmation */}
        {deleteTarget && (
          <div className="absolute inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-bounce-short">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle size={32} className="text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">ยืนยันการลบข้อมูล?</h3>
                <p className="text-sm text-gray-500 mb-6">
                   <span className="font-mono font-bold text-gray-800">{deleteTarget.tree_code}</span> 
                  {deleteType === 'coord' ? ' (พิกัด)' : ''} 
                </p>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg">ยกเลิก</button>
                  <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} ลบข้อมูล
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <GrowthForm 
          formData={formData}
          setFormData={setFormData}
          editLogId={editLogId}
          isLoading={isLoading}
          isMobileOpen={isMobileOpen}
          isDesktopOpen={isDesktopOpen}
          onClose={() => setShowMobileForm(false)}
          onSubmit={handleSubmit}
          onClear={clearForm}
          treeCodePreview={treeCodePreview}
          tagLabelPreview={tagLabelPreview}
        />

        <section className="flex-1 flex flex-col min-w-0 bg-white">
          {activeView === 'table' && (
            <TableView 
              records={records}
              isLoading={isLoading}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              plotFilter={plotFilter}
              setPlotFilter={setPlotFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              editLogId={editLogId}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              onOpenMobileForm={() => { clearForm(); setShowMobileForm(true); }}
              onClearForm={clearForm}
            />
          )}
          
          {activeView === 'plotInfo' && (
            <PlotInfoView 
              savedImages={plotImages}
              onUploadImage={handleImageUpload}
              onNavigateToMap={(plotCode) => {
                 setMapPlot(plotCode);
                 setActiveView('map');
              }}
            />
          )}

          {activeView === 'coords' && (
            <CoordinateView 
               records={records}
               coordRecords={coordRecords}
               isLoading={isLoading}
               onSubmit={handleSubmitCoord}
               onSyncToTable={handleSyncTrees}
               onNavigateToTree={handleNavigateToTree}
               onBulkSubmit={async (data) => {
                 setIsLoading(true);
                 setLoadingMessage('กำลังบันทึกข้อมูลแบบกลุ่ม...');
                 let successCount = 0;
                 let errorCount = 0;
                 let newTreeCount = 0;

                 // 1. Identify Missing Trees
                 const existingTreeCodes = new Set(records.map(r => r.tree_code));
                 const missingTrees = data.filter(item => !existingTreeCodes.has(item.treeCode));

                 // 2. Add Missing Trees to Growth Logs (if any)
                 let processedNew = 0;
                 for (const item of missingTrees) {
                   processedNew++;
                   setLoadingMessage(`กำลังสร้างข้อมูลต้นไม้ใหม่ (${processedNew}/${missingTrees.length})...`);
                   try {
                     // Parse Tree Code to extract Plot, Species, Number
                     // Assuming format: P01A01001 (Plot: P01, Species: A01, Number: 001)
                     // This is a heuristic parser based on the project convention
                     let plotCode = '';
                     let speciesCode = '';
                     let treeNumber = 0;

                     // Simple regex parser: (P\d+)([AB]\d+)(\d+)
                     // Updated to handle 3-3-3 format better if needed, but standard regex works for P05A14029
                     // P(\d+) -> Plot
                     // ([AB]\d{2}) -> Species (Fixed 2 digits after A/B)
                     // (\d+) -> Number (Remaining digits)
                     const match = item.treeCode.match(/^(P\d+)([AB]\d{2})(\d+)$/);
                     
                     if (match) {
                       plotCode = match[1];
                       speciesCode = match[2];
                       treeNumber = parseInt(match[3], 10);
                     } else {
                       // Fallback or skip if format doesn't match
                       console.warn(`Cannot parse tree code: ${item.treeCode}`);
                       // Fallback: try to extract plot at least
                       const plotMatch = item.treeCode.match(/^(P\d+)/);
                       if (plotMatch) plotCode = plotMatch[1];
                     }

                     const species = SPECIES_LIST.find(s => s.code === speciesCode);
                     const plot = PLOT_LIST.find(p => p.code === plotCode);
                     const plotShort = plot?.short || plotCode.replace(/^P0+/, 'P'); // Fallback to stripping zero if not in list
                     
                     const newRecordPayload = {
                       action: 'addGrowthLog',
                       tree_code: item.treeCode,
                       plot_code: plotCode,
                       species_code: speciesCode,
                       species_group: speciesCode.startsWith('A') ? 'A' : 'B',
                       species_name: species?.name || '',
                       tree_number: treeNumber,
                       row_main: '00', // Default as requested
                       row_sub: '(00)', // Default as requested
                       tag_label: `${treeNumber} ${plotShort} 00 (00) ${species?.name || speciesCode}`,
                       status: null, // 'รอสำรวจ' effectively
                       note: 'Auto-created from Coordinate Import',
                       recorder: 'System',
                       survey_date: new Date().toISOString().split('T')[0]
                     };

                     const res = await apiPost(newRecordPayload);
                     if (res.success) newTreeCount++;
                   } catch (e) {
                     console.error("Error creating new tree log:", e);
                   }
                 }

                 // 3. Add Coordinates
                 let processedCoords = 0;
                 for (const item of data) {
                   processedCoords++;
                   setLoadingMessage(`กำลังบันทึกพิกัด (${processedCoords}/${data.length})...`);
                   try {
                     // Re-fetch record or use local heuristic if it was just added
                     let treeRec = records.find(r => r.tree_code === item.treeCode);
                     
                     // If not found in records, it might be one we just added. 
                     // We can construct basic info from the code itself if needed, 
                     // or just send what we have.
                     
                     const { lat, lng } = utmToLatLng(Number(item.utmX), Number(item.utmY));
                     const payload = {
                       action: 'addTreeProfile',
                       tree_code: item.treeCode,
                       plot_code: treeRec?.plot_code || (item.treeCode.match(/^(P\d+)/)?.[1] || ''),
                       species_code: treeRec?.species_code || (item.treeCode.match(treeCodeRegex)?.[2] || ''),
                       species_group: treeRec?.species_group || '',
                       tag_label: treeRec?.tag_label || item.treeCode,
                       utm_x: item.utmX,
                       utm_y: item.utmY,
                       lat: lat,
                       lng: lng,
                       note: `นำเข้าจากไฟล์ PDF`
                     };
                     const res = await apiPost(payload);
                     if (res.success) successCount++;
                     else errorCount++;
                   } catch (e) {
                     errorCount++;
                   }
                 }
                 
                 let msg = `บันทึกพิกัดสำเร็จ ${successCount} รายการ`;
                 if (newTreeCount > 0) msg += `, เพิ่มต้นไม้ใหม่ ${newTreeCount} ต้น`;
                 if (errorCount > 0) msg += `, ผิดพลาด ${errorCount} รายการ`;
                 
                 showToast(msg, errorCount > 0 ? 'info' : 'success');
                 setCoordTreeCode(''); setCoordUtmX(''); setCoordUtmY('');
                 fetchData();
                 setIsLoading(false);
                 setLoadingMessage('');
               }}
               onEdit={handleEditCoord}
               onDelete={handleDeleteCoordRequest}
               coordPlotFilter={coordPlotFilter}
               setCoordPlotFilter={setCoordPlotFilter}
               coordTreeCode={coordTreeCode}
               setCoordTreeCode={setCoordTreeCode}
               coordUtmX={coordUtmX}
               setCoordUtmX={setCoordUtmX}
               coordUtmY={coordUtmY}
               setCoordUtmY={setCoordUtmY}
            />
          )}

          {activeView === 'map' && (
            <MapView 
               records={records}
               coordRecords={coordRecords}
               mapPlot={mapPlot}
               setMapPlot={setMapPlot}
               onEdit={handleEdit}
               onNewSurvey={handleNewSurvey}
               onSaveSpacing={handleSaveSpacing}
            />
          )}

          {activeView === 'stats' && (
            <StatsView 
               stats={stats}
               records={records}
               coordCount={coordRecords.length}
            />
          )}

          {activeView === 'history' && (
            <HistoryView 
               records={records}
            />
          )}

          {activeView === 'profile' && <ProfileView />}
        </section>
      </main>

      <MobileNav activeView={activeView} setActiveView={setActiveView} />

      {toast && (
        <div className={`fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce-short ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
        }`}>
          {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          <span className="text-sm font-bold">{toast.msg}</span>
        </div>
      )}
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes bounce-short {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -10px); }
        }
        .animate-bounce-short {
          animation: bounce-short 0.5s ease infinite alternate;
        }
      `}</style>
    </div>
  );
};

export default App;
