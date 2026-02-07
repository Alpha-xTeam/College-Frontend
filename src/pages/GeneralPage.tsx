import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Building2, 
  MapPin, 
  Users, 
  Calendar, 
  Search,
  LayoutGrid,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  Bell
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Announcement } from '@/types';

interface Department {
  id: string;
  name: string;
  name_ar: string;
  code: string;
}

interface Room {
  id: string;
  name: string;
  code: string;
  capacity: number;
  status: 'available' | 'occupied';
  current_lecture?: {
    course: string;
    teacher: string;
    ends_at: string;
  };
}

export function GeneralPage() {
  const { isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const fetchDeptsAndGlobalAnn = async () => {
      try {
        const [deptsRes, annRes] = await Promise.all([
          api.get('/departments'),
          api.get('/announcements') // This should return global announcements
        ]);
        setDepartments(deptsRes.data);
        setAnnouncements(annRes.data.filter((a: Announcement) => a.is_global));
      } catch (err) {
        console.error('Failed to fetch initial data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeptsAndGlobalAnn();
  }, []);

  useEffect(() => {
    const fetchRooms = async () => {
      if (!selectedDept) {
        setRooms([]);
        return;
      }
      try {
        setRoomsLoading(true);
        const res = await api.get(`/rooms?department_id=${selectedDept}`);
        setRooms(res.data);
      } catch (err) {
        console.error('Failed to fetch rooms', err);
      } finally {
        setRoomsLoading(false);
      }
    };
    fetchRooms();

    // Refresh status every 60 seconds
    const interval = setInterval(fetchRooms, 60000);
    return () => clearInterval(interval);
  }, [selectedDept]);

  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
      {/* Navbar Simple */}
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-200">
            C
          </div>
          <span className="text-xl font-black text-slate-800 tracking-tight">نظام الكلية</span>
        </div>
        
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
             <div className="flex items-center gap-3">
                <Link to="/dashboard" className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  لوحة التحكم
                </Link>
             </div>
          ) : (
            <Link to="/" className="px-5 py-2.5 text-indigo-600 text-sm font-black hover:bg-indigo-50 rounded-2xl transition-all">
              تسجيل الدخول
            </Link>
          )}
        </div>
      </nav>

      {/* Announcements Ticker */}
      {announcements.length > 0 && (
        <div className="bg-orange-500 py-3 overflow-hidden relative border-y border-orange-600/20 shadow-lg shadow-orange-100/50">
          <div className="absolute right-0 top-0 h-full bg-orange-600 px-6 z-10 flex items-center gap-2 shadow-xl">
            <Bell className="w-4 h-4 text-white animate-bounce" />
            <span className="text-white text-[11px] font-black uppercase tracking-widest whitespace-nowrap">تنبيه عاجل</span>
          </div>
          <div className="flex whitespace-nowrap animate-marquee">
             {announcements.map((ann, idx) => (
               <span key={ann.id} className="text-white text-sm font-black mx-12 flex items-center gap-3">
                 <span className="opacity-50">#</span>
                 {ann.title}: {ann.content}
                 {idx === announcements.length - 1 && <span className="mr-24 opacity-0">.</span>}
               </span>
             ))}
             {/* Duplicate for infinite effect */}
             {announcements.map((ann) => (
               <span key={`dup-${ann.id}`} className="text-white text-sm font-black mx-12 flex items-center gap-3">
                 <span className="opacity-50">#</span>
                 {ann.title}: {ann.content}
               </span>
             ))}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Welcome Section */}
        <section className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
            مرحباً بك في <span className="text-indigo-600">جدولنا الإلكتروني</span>
          </h1>
          <p className="text-lg text-slate-500 font-bold max-w-2xl mx-auto">
            تصفح قاعات الأقسام، جداولها، وآخر الإعلانات بكل سهولة بدون الحاجة لتسجيل دخول.
          </p>
          
          {isAuthenticated && currentUser?.role === 'student' && (
            <div className="pt-6">
              <button 
                onClick={() => navigate('/schedule')}
                className="group relative inline-flex items-center gap-4 px-8 py-4 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-indigo-600 transition-all duration-500 shadow-xl shadow-slate-200/50 hover:shadow-indigo-600/10 active:scale-95"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                  <Calendar className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ميزة الطالب</p>
                  <p className="text-lg font-black text-slate-800">عرض جدولي الدراسي اليومي</p>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-indigo-600 group-hover:-translate-x-1 transition-all rotate-180" />
              </button>
            </div>
          )}
        </section>

        {/* Selection & Search */}
        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> اختر القسم الدراسي
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDept(dept.id)}
                    className={cn(
                      "px-4 py-4 rounded-2xl text-sm font-black transition-all border text-center",
                      selectedDept === dept.id 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" 
                        : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200"
                    )}
                  >
                    {dept.name_ar}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedDept && (
            <div className="pt-6 border-t border-slate-50">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">قاعات القسم ({filteredRooms.length})</h3>
                </div>
                
                <div className="relative group w-full max-w-sm">
                   <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                   <input 
                      type="text" 
                      placeholder="ابحث عن قاعة بالاسم أو الرمز..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-12 pr-11 pl-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all placeholder:text-slate-400"
                   />
                </div>
              </div>

              {roomsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-400 font-bold text-sm">جاري جلب القاعات...</p>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                   <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <Search className="w-10 h-10" />
                   </div>
                   <p className="text-slate-400 font-bold">لم نجد أي قاعة تطابق بحثك</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredRooms.map((room) => (
                    <div key={room.id} className="group bg-slate-50 p-6 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-indigo-600/10 hover:border-indigo-100 transition-all duration-500 overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-indigo-100 transition-colors" />
                      
                      <div className="relative space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <MapPin className="w-6 h-6 text-indigo-600" />
                          </div>
                          <span className="font-mono text-[10px] font-black tracking-widest text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
                            {room.code}
                          </span>
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">
                            {room.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-2">
                             <Users className="w-3.5 h-3.5 text-slate-400" />
                             <span className="text-xs font-bold text-slate-500">يتسع لـ {room.capacity} طالب</span>
                          </div>
                          
                          {room.status === 'occupied' && room.current_lecture && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl space-y-1">
                               <p className="text-[10px] font-black text-red-400 uppercase">قيد المحاضرة الآن</p>
                               <p className="text-xs font-black text-red-900 truncate">{room.current_lecture.course}</p>
                               <p className="text-[9px] font-bold text-red-700/70 truncate">الأستاذ: {room.current_lecture.teacher}</p>
                               <p className="text-[9px] font-bold text-red-700 mt-1">تنتهي الساعة {room.current_lecture.ends_at}</p>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 flex flex-col gap-2">
                          <Link 
                            to={`/room/${room.code}`}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white text-indigo-600 border border-slate-100 rounded-xl text-xs font-black hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                          >
                            عرض الجدول <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          
                          <div className={cn(
                            "w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors",
                            room.status === 'available' 
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                              : "bg-red-50 text-red-600 border border-red-100"
                          )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", room.status === 'available' ? "bg-emerald-500" : "bg-red-500")} />
                            القاعة حالياً: {room.status === 'available' ? 'متوفرة' : 'مشغولة'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {!selectedDept && !loading && (
            <div className="py-20 text-center space-y-4 animate-pulse">
               <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-200">
                  <Building2 className="w-10 h-10" />
               </div>
               <p className="text-slate-400 font-bold">يرجى اختيار قسم لعرض قاعاته</p>
            </div>
          )}
        </section>

        {/* Footer Info */}
        <footer className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-slate-200">
           <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                 <Clock className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="space-y-1">
                 <h5 className="font-black text-slate-800">بيانات فورية</h5>
                 <p className="text-sm text-slate-500 font-bold leading-relaxed">جداول القاعات تتحدث بشكل فوري عند أي تغيير من قبل القسم.</p>
              </div>
           </div>
           
           <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                 <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="space-y-1">
                 <h5 className="font-black text-slate-800">نظام ذكي</h5>
                 <p className="text-sm text-slate-500 font-bold leading-relaxed">يتيح للطلاب والأساتذة معرفة إشغال القاعات وتوفرها لحظياً.</p>
              </div>
           </div>

           <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                 <Info className="w-6 h-6 text-orange-600" />
              </div>
              <div className="space-y-1">
                 <h5 className="font-black text-slate-800">دعم متكامل</h5>
                 <p className="text-sm text-slate-500 font-bold leading-relaxed">نوفر واجهة مبسّطة للضيوف تسهل الوصول للمعلومة بأسرع وقت.</p>
              </div>
           </div>
        </footer>

        <div className="text-center pt-8">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">نظام الكلية الإلكتروني • 2026</p>
        </div>
      </main>
    </div>
  );
}
