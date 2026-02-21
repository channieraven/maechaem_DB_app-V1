import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  TreeDeciduous, 
  Map, 
  BarChart3, 
  Shield, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  Database
} from 'lucide-react';

interface HomePageProps {
  onLoginClick?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onLoginClick }) => {
  const { login, isLoading } = useAuth();

  const handleLogin = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      login();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-green-600 p-2 rounded-lg">
              <TreeDeciduous className="text-white h-6 w-6" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-bold text-sm sm:text-lg md:text-xl tracking-tight text-gray-900 leading-tight whitespace-nowrap">ระบบบันทึกข้อมูลรายแปลง</span>
              <span className="text-[10px] sm:text-xs text-gray-500 font-medium whitespace-nowrap">สำนักวิจัยและพัฒนาการป่าไม้</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-sm font-medium text-gray-500 hover:text-gray-900 hidden sm:block">นโยบายความเป็นส่วนตัว</a>
            <a href="/terms" className="text-sm font-medium text-gray-500 hover:text-gray-900 hidden sm:block">ข้อกำหนดการใช้งาน</a>
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all shadow-lg shadow-gray-900/20 flex items-center gap-1 md:gap-2 whitespace-nowrap"
            >
              {isLoading ? 'กำลังโหลด...' : 'เข้าสู่ระบบ'}
              <ArrowRight size={16} className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 text-xs font-semibold uppercase tracking-wide mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            ระบบฐานข้อมูลอย่างเป็นทางการ
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 mb-8 max-w-4xl mx-auto leading-tight">
            ร่วมอนุรักษ์ <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">ร่วมพัฒนาป่าอเนกประสงค์แม่แจ่ม</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            แพลตฟอร์มดิจิทัลครบวงจรสำหรับนักวิจัยและเจ้าหน้าที่ป่าไม้ เพื่อติดตาม วิเคราะห์ และบริหารจัดการข้อมูลต้นไม้ในพื้นที่อำเภอแม่แจ่ม จังหวัดเชียงใหม่
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleLogin}
              className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg shadow-xl shadow-green-600/20 transition-all transform hover:-translate-y-1"
            >
              เข้าถึงฐานข้อมูล
            </button>
            <a 
              href="#features"
              className="w-full sm:w-auto px-8 py-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-semibold text-lg transition-all"
            >
              เรียนรู้เพิ่มเติม
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">เครื่องมือทรงพลังสำหรับนักวิจัย</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">ทุกสิ่งที่คุณต้องการเพื่อการจัดการข้อมูลป่าไม้อย่างมีประสิทธิภาพและแม่นยำ</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Database className="w-6 h-6 text-blue-600" />,
                title: "บันทึกข้อมูลครบถ้วน",
                desc: "ติดตามรายละเอียดชนิดพันธุ์ การเติบโต และสถานะสุขภาพของต้นไม้ พร้อมรองรับพืชหลากหลายประเภท"
              },
              {
                icon: <Map className="w-6 h-6 text-green-600" />,
                title: "แผนที่ภูมิสารสนเทศ",
                desc: "แผนที่แบบโต้ตอบพร้อมระบบติดตามพิกัด เพื่อแสดงตำแหน่งแปลงและกระจายตัวของต้นไม้"
              },
              {
                icon: <BarChart3 className="w-6 h-6 text-purple-600" />,
                title: "การวิเคราะห์ข้อมูล",
                desc: "สถิติและการแสดงผลข้อมูลแบบเรียลไทม์ ทั้งความหนาแน่นของป่า ความหลากหลายทางชีวภาพ และแนวโน้มการเติบโต"
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed break-words">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Privacy & Transparency */}
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wide mb-6">
                <Shield size={14} />
                ความเป็นส่วนตัวต้องมาก่อน
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">ความโปร่งใสในการใช้ข้อมูล</h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                เราให้ความสำคัญกับความเป็นส่วนตัวและมุ่งมั่นที่จะปกป้องข้อมูลส่วนบุคคลของคุณ แอปพลิเคชันขอสิทธิ์เข้าถึงโปรไฟล์ Google เพียงเพื่อการยืนยันตัวตนและตรวจสอบสิทธิ์เท่านั้น
              </p>
              
              <div className="space-y-4">
                {[
                  "การยืนยันตัวตนสำหรับนักวิจัยที่ได้รับอนุญาต",
                  "การควบคุมการเข้าถึงตามบทบาท (ผู้ดูแลระบบ, นักวิจัย)",
                  "การจัดการเซสชันที่ปลอดภัย",
                  "ไม่มีการแบ่งปันข้อมูลส่วนบุคคลกับบุคคลที่สาม"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Users className="text-gray-900" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">การขอใช้ข้อมูลผู้ใช้</h3>
                  <p className="text-sm text-gray-500">เหตุผลที่เราต้องการข้อมูลของคุณ</p>
                </div>
              </div>
              <div className="space-y-4 text-sm text-gray-600">
                <p>
                  <strong className="text-gray-900">โปรไฟล์ Google (อีเมลและชื่อ):</strong> ใช้เพื่อสร้างโปรไฟล์ผู้ใช้และระบุตัวตนของคุณในระบบ
                </p>
                <p>
                  <strong className="text-gray-900">รูปโปรไฟล์:</strong> แสดงในส่วนหัวของแอปพลิเคชันเพื่อระบุผู้ใช้ที่เข้าสู่ระบบในปัจจุบัน
                </p>
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <p className="text-xs text-gray-400">
                    การลงชื่อเข้าใช้ถือว่าคุณยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวของเรา
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <TreeDeciduous className="text-green-400 h-5 w-5" />
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-base">ระบบบันทึกข้อมูลรายแปลง</span>
                <span className="text-[10px] text-gray-400">สำนักวิจัยและพัฒนาการป่าไม้</span>
              </div>
            </div>
            <div className="flex gap-6 text-xs text-gray-400">
              <a href="/privacy" className="hover:text-white transition-colors">นโยบายความเป็นส่วนตัว</a>
              <a href="/terms" className="hover:text-white transition-colors">ข้อกำหนดการใช้งาน</a>
              <a href="mailto:support@maechaem-tree-db.com" className="hover:text-white transition-colors">ติดต่อฝ่ายสนับสนุน</a>
            </div>
            <div className="text-xs text-gray-500">
              © {new Date().getFullYear()} ระบบบันทึกข้อมูลรายแปลง สำนักวิจัยและพัฒนาการป่าไม้
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
