
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Download, Upload, Image as ImageIcon, Map as MapIcon, User, Calendar, Plus, X, Loader2, Maximize, ZoomIn, ZoomOut, RotateCcw, CloudLightning } from 'lucide-react';
import { PLOT_LIST, PLOT_PLAN_DATA } from '../constants';
import { PlotImage } from '../types';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { useAuth } from '../contexts/AuthContext';

interface PlotInfoViewProps {
  savedImages: PlotImage[];
  onUploadImage: (img: PlotImage) => void;
  onNavigateToMap: (plotCode: string) => void;
}

// --- Lightbox Component ---
const Lightbox = ({ image, onClose }: { image: PlotImage, onClose: () => void }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent background scrolling when lightbox is open
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 5));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
        setIsDragging(true);
        setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
        setPosition({
            x: e.touches[0].clientX - dragStart.x,
            y: e.touches[0].clientY - dragStart.y
        });
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-sm z-20 absolute top-0 w-full border-b border-white/10">
         <div className="text-white">
            <h3 className="font-bold text-sm md:text-base">{image.description || 'ไม่มีชื่อรูปภาพ'}</h3>
            <p className="text-xs text-gray-400">{image.type} • {image.date || '-'}</p>
         </div>
         <div className="flex items-center gap-2">
            <a 
              href={image.url} 
              download={`image-${image.id}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
              title="ดาวน์โหลด"
            >
               <Download size={20} />
            </a>
            <button 
              onClick={onClose} 
              className="p-2 text-white hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors"
            >
               <X size={24} />
            </button>
         </div>
      </div>

      {/* Main Image Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center relative cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        <img 
            src={image.url} 
            alt="Full view" 
            className="max-w-none transition-transform duration-75 ease-out select-none"
            style={{ 
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                maxHeight: '90vh',
                maxWidth: '90vw',
                objectFit: 'contain'
            }}
            draggable={false}
        />
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/80 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-4 border border-white/10 z-20 shadow-2xl">
         <button onClick={() => handleZoom(-0.25)} className="text-white hover:text-green-400 p-1"><ZoomOut size={20} /></button>
         <span className="text-xs font-mono text-gray-300 w-12 text-center">{Math.round(scale * 100)}%</span>
         <button onClick={() => handleZoom(0.25)} className="text-white hover:text-green-400 p-1"><ZoomIn size={20} /></button>
         <div className="w-px h-4 bg-gray-600 mx-1"></div>
         <button 
            onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }} 
            className="text-white hover:text-blue-400 p-1 flex items-center gap-1 text-xs"
         >
            <RotateCcw size={16} /> Reset
         </button>
      </div>
    </div>
  );
};

const PlanCard = ({ 
      title, 
      image, 
      placeholder, 
      orientation = 'portrait',
      targetType,
      selectedPlot,
      setViewImage,
      setUploadType,
      setShowUploadModal
  }: { 
      title: string, 
      image?: PlotImage, 
      placeholder: string,
      orientation?: 'landscape' | 'portrait',
      targetType: PlotImage['type'],
      selectedPlot: string,
      setViewImage: (img: PlotImage) => void,
      setUploadType: (type: PlotImage['type']) => void,
      setShowUploadModal: (show: boolean) => void
  }) => (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${orientation === 'landscape' ? 'aspect-[297/210]' : 'aspect-[210/297]'} w-full`}>
       <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0 h-12">
         <h4 className="font-bold text-gray-700 text-xs truncate mr-2" title={title}>{title}</h4>
         {image?.url && (
            <a 
              href={image.url} 
              download={`plan-${selectedPlot}-${image.type}`}
              className="text-xs flex items-center gap-1 text-blue-600 hover:underline shrink-0"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()} // Prevent card click
            >
              <Download size={14} />
            </a>
         )}
       </div>
       <div className="flex-1 bg-gray-100 relative group flex items-center justify-center overflow-hidden">
          {image?.url ? (
            <div 
                className="relative w-full h-full cursor-zoom-in"
                onClick={() => setViewImage(image)}
            >
               <img src={image.url} alt={title} className="w-full h-full object-contain bg-white" />
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                     <Maximize size={24} className="drop-shadow-md" />
                  </div>
               </div>
            </div>
          ) : (
            <div className="text-gray-400 flex flex-col items-center p-4 text-center">
               <ImageIcon size={32} className="mb-2 opacity-20" />
               <span className="text-xs mb-2">{placeholder}</span>
               <button 
                 onClick={() => {
                     setUploadType(targetType);
                     setShowUploadModal(true);
                 }} 
                 className="mt-1 text-[10px] bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 shadow-sm"
               >
                 + อัปโหลด
               </button>
            </div>
          )}
       </div>
       <div className="p-2 text-[10px] text-gray-500 bg-white border-t border-gray-100 flex justify-between shrink-0">
          <span className="truncate max-w-[60%]">{image?.uploader ? `${image.uploader}` : '-'}</span>
          <span>{image?.date || '-'}</span>
       </div>
    </div>
);

const PlotInfoView: React.FC<PlotInfoViewProps> = ({ savedImages, onUploadImage, onNavigateToMap }) => {
  const { user } = useAuth();
  const [selectedPlot, setSelectedPlot] = useState(PLOT_LIST[0].code);
  const [activeTab, setActiveTab] = useState<'plans' | 'gallery'>('plans');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewImage, setViewImage] = useState<PlotImage | null>(null);
  
  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadUploader, setUploadUploader] = useState(user?.fullName || user?.name || '');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadType, setUploadType] = useState<PlotImage['type']>('gallery');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Update uploader if user changes
  useEffect(() => {
    if (user) {
        setUploadUploader(user.fullName || user.name || '');
    }
  }, [user]);
  
  // Optimistic UI State
  const [localImages, setLocalImages] = useState<PlotImage[]>([]);

  // Merge Saved + Local
  const allImages = useMemo(() => {
     return [...localImages, ...savedImages];
  }, [savedImages, localImages]);

  const planImages = useMemo(() => {
    // Priority: Dynamic (Latest first) > Static
    const staticPlans = PLOT_PLAN_DATA.filter(p => p.plotCode === selectedPlot);
    const dynamicPlans = allImages.filter(p => p.plotCode === selectedPlot && p.type.startsWith('plan'));
    
    return [...dynamicPlans.slice().reverse(), ...staticPlans];
  }, [selectedPlot, allImages]);

  const galleryList = useMemo(() => {
    return allImages.filter(p => p.plotCode === selectedPlot && p.type === 'gallery');
  }, [selectedPlot, allImages]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadUploader) return;

    setIsUploading(true);

    try {
        const imageUrl = await uploadToCloudinary(uploadFile);
        console.log("Cloudinary URL:", imageUrl);

        let desc = '';
        if (uploadType === 'gallery') desc = uploadDescription;
        if (uploadType === 'plan_pre_1') desc = 'แผนผังก่อนปลูก (แผ่น 1)';
        if (uploadType === 'plan_pre_2') desc = 'แผนผังก่อนปลูก (แผ่น 2)';
        if (uploadType === 'plan_post_1') desc = 'แผนผังหลังปลูก';

        const newImage: PlotImage = {
          id: Date.now().toString(),
          plotCode: selectedPlot,
          type: uploadType,
          url: imageUrl,
          description: desc,
          uploader: uploadUploader,
          date: uploadDate
        };

        setLocalImages(prev => [newImage, ...prev]);
        onUploadImage(newImage);

        setShowUploadModal(false);
        setUploadFile(null);
        setUploadUploader(user?.fullName || user?.name || '');
        setUploadDescription('');
        
        if (uploadType.startsWith('plan')) {
            setActiveTab('plans');
        } else {
            setActiveTab('gallery');
        }

    } catch (error: any) {
        console.error("Upload Error:", error);
        alert(`เกิดข้อผิดพลาดในการอัปโหลด: ${error.message || 'โปรดตรวจสอบการตั้งค่า Cloudinary'}`);
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 flex flex-col relative h-full">
      {/* Lightbox Overlay */}
      {viewImage && <Lightbox image={viewImage} onClose={() => setViewImage(null)} />}

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
         <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-green-800">
               <ImageIcon className="text-green-600" /> ข้อมูลรายแปลง (Plot Info)
            </h2>
            <p className="text-xs text-gray-500">แผนผังและภาพถ่ายภายในแปลง</p>
         </div>
         
         <div className="flex items-center gap-3">
            <select 
               value={selectedPlot}
               onChange={(e) => setSelectedPlot(e.target.value)}
               className="bg-green-50 border border-green-200 text-green-800 font-bold rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500/30"
            >
               {PLOT_LIST.map(p => <option key={p.code} value={p.code}>{p.code} - {p.name}</option>)}
            </select>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-all"
            >
               <CloudLightning size={16} /> <span className="hidden md:inline">อัปโหลด (Cloud)</span>
            </button>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-4">
         <button 
           onClick={() => setActiveTab('plans')}
           className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'plans' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-green-600'}`}
         >
            แผนผัง (Plans)
         </button>
         <button 
           onClick={() => setActiveTab('gallery')}
           className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'gallery' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-green-600'}`}
         >
            อัลบั้มรูปภาพ (Gallery)
         </button>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
         {activeTab === 'plans' && (
            <div className="space-y-8 animate-in fade-in duration-300">
               
               {/* Pre-planting Section (A4 Landscape x 2) */}
               <div>
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-l-4 border-green-600 pl-3">
                     1. แผนผังก่อนปลูก (Pre-planting)
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <PlanCard 
                       title="แผ่นที่ 1 (ซ้าย)" 
                       image={planImages.find(p => p.type === 'plan_pre_1' || p.type === 'plan_pre')}
                       placeholder="อัปโหลดแผ่นที่ 1"
                       orientation="landscape"
                       targetType="plan_pre_1"
                       selectedPlot={selectedPlot}
                       setViewImage={setViewImage}
                       setUploadType={setUploadType}
                       setShowUploadModal={setShowUploadModal}
                     />
                     <PlanCard 
                       title="แผ่นที่ 2 (ขวา)" 
                       image={planImages.find(p => p.type === 'plan_pre_2')}
                       placeholder="อัปโหลดแผ่นที่ 2 (ถ้ามี)"
                       orientation="landscape"
                       targetType="plan_pre_2"
                       selectedPlot={selectedPlot}
                       setViewImage={setViewImage}
                       setUploadType={setUploadType}
                       setShowUploadModal={setShowUploadModal}
                     />
                  </div>
               </div>

               <hr className="border-gray-200" />

               {/* Post-planting Section (A4 Portrait x 1) */}
               <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-1/2 lg:w-1/3">
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-l-4 border-blue-600 pl-3">
                         2. แผนผังหลังปลูก (Post)
                      </h3>
                      <PlanCard 
                        title="ฉบับที่ 1 (Post-planting #1)" 
                        image={planImages.find(p => p.type === 'plan_post_1')}
                        placeholder="อัปโหลดแผนผังหลังปลูก"
                        orientation="portrait"
                        targetType="plan_post_1"
                        selectedPlot={selectedPlot}
                        setViewImage={setViewImage}
                        setUploadType={setUploadType}
                        setShowUploadModal={setShowUploadModal}
                      />
                  </div>
                  
                  {/* Info Box */}
                  <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-6 flex flex-col justify-center gap-4">
                     <div>
                        <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                           <MapIcon size={20} /> แผนผังปัจจุบัน (Live Generated)
                        </h4>
                        <p className="text-sm text-blue-700 mt-2 leading-relaxed">
                           ระบบสามารถสร้างแผนผังต้นไม้ปัจจุบันได้อัตโนมัติจากการเก็บพิกัด GPS <br/>
                           โดยไม่ต้องวาดด้วยมือ สำหรับใช้ประกอบรายงานฉบับต่อไป
                        </p>
                     </div>
                     <button 
                       onClick={() => onNavigateToMap(selectedPlot)}
                       className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all w-fit"
                     >
                        ดูแผนที่ดาวเทียมปัจจุบัน
                     </button>
                  </div>
               </div>
            </div>
         )}

         {activeTab === 'gallery' && (
            <div className="animate-in fade-in duration-300">
               {galleryList.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                     {galleryList.map(img => (
                        <div 
                           key={img.id} 
                           className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-all cursor-pointer"
                           onClick={() => setViewImage(img)}
                        >
                           <div className="aspect-square bg-gray-100 relative">
                              <img src={img.url} alt="Gallery" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                 <button className="p-2 bg-white/20 rounded-full text-white hover:bg-white/40 backdrop-blur-sm">
                                    <Maximize size={24} />
                                 </button>
                              </div>
                           </div>
                           <div className="p-3">
                              <p className="text-sm font-bold text-gray-800 truncate">{img.description || 'ไม่มีคำอธิบาย'}</p>
                              <div className="flex justify-between items-center mt-2 text-[10px] text-gray-500">
                                 <span className="flex items-center gap-1"><User size={10} /> {img.uploader || '-'}</span>
                                 <span className="flex items-center gap-1"><Calendar size={10} /> {img.date}</span>
                              </div>
                           </div>
                        </div>
                     ))}
                     <button 
                       onClick={() => {
                           setUploadType('gallery');
                           setShowUploadModal(true);
                       }}
                       className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all"
                     >
                        <Plus size={32} />
                        <span className="text-xs font-bold mt-2">เพิ่มรูปภาพ</span>
                     </button>
                  </div>
               ) : (
                  <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                     <ImageIcon size={64} className="mx-auto text-gray-300 mb-4" />
                     <h3 className="text-gray-500 font-bold">ยังไม่มีรูปภาพในอัลบั้ม</h3>
                     <p className="text-sm text-gray-400 mb-6">อัปโหลดภาพถ่ายดิน ตัวอย่างต้นไม้ หรือบรรยากาศภายในแปลง</p>
                     <button 
                        onClick={() => {
                            setUploadType('gallery');
                            setShowUploadModal(true);
                        }}
                        className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm hover:bg-green-700 transition-all"
                     >
                        อัปโหลดรูปแรก
                     </button>
                  </div>
               )}
            </div>
         )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[5000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800">อัปโหลดรูปภาพ (Cloud)</h3>
                 <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpload} className="p-6 space-y-4">
                 <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2 text-xs text-blue-700">
                    <CloudLightning size={16} className="shrink-0 mt-0.5" />
                    <p>ระบบจะอัปโหลดรูปภาพขึ้น Cloud Storage โดยอัตโนมัติ ทำให้รวดเร็วและไม่เปลืองพื้นที่ Google Drive</p>
                 </div>

                 <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">ตำแหน่ง/ประเภท</label>
                    <select 
                      value={uploadType} 
                      onChange={(e) => setUploadType(e.target.value as any)}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                    >
                       <option value="gallery">📸 ภาพถ่ายทั่วไป (Gallery)</option>
                       <optgroup label="🗺️ แผนผังก่อนปลูก">
                          <option value="plan_pre_1">แผ่นที่ 1 (ด้านซ้าย)</option>
                          <option value="plan_pre_2">แผ่นที่ 2 (ด้านขวา)</option>
                       </optgroup>
                       <optgroup label="🗺️ แผนผังหลังปลูก">
                          <option value="plan_post_1">ฉบับที่ 1</option>
                       </optgroup>
                    </select>
                 </div>
                 
                 <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">เลือกไฟล์</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative group">
                       <input 
                         type="file" 
                         accept="image/*"
                         onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                       />
                       {uploadFile ? (
                          <div className="text-green-600 font-bold flex flex-col items-center">
                             <ImageIcon size={24} className="mb-2" />
                             {uploadFile.name}
                          </div>
                       ) : (
                          <div className="text-gray-400 flex flex-col items-center group-hover:text-green-600">
                             <Upload size={24} className="mb-2" />
                             <span className="text-xs">คลิกเพื่อเลือกรูปภาพ</span>
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-sm font-bold text-gray-700">ผู้ถ่าย/อัปโหลด</label>
                       <input 
                         type="text" 
                         required 
                         value={uploadUploader}
                         readOnly
                         className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none bg-gray-100 text-gray-600 cursor-not-allowed"
                         placeholder="ชื่อ-สกุล"
                       />
                       <p className="text-[10px] text-blue-600">ชื่อผู้อัปโหลดจะขึ้นอัตโนมัติ โดยดึงจากชื่อ-สกุลของผู้ใช้งาน</p>
                    </div>
                    <div className="space-y-1">
                       <label className="text-sm font-bold text-gray-700">วันที่ถ่าย</label>
                       <input 
                         type="date" 
                         required 
                         value={uploadDate}
                         onChange={e => setUploadDate(e.target.value)}
                         className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
                       />
                    </div>
                 </div>

                 <button 
                   type="submit" 
                   disabled={!uploadFile || !uploadUploader || isUploading}
                   className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
                 >
                    {isUploading ? <Loader2 className="animate-spin" size={20} /> : null}
                    {isUploading ? 'กำลังอัปโหลด...' : 'ยืนยันการอัปโหลด'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default PlotInfoView;
