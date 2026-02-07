import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import type { Lecture, DayName, Room, Announcement, AcademicLevel } from '@/types';
import { Calendar, Clock, MapPin, ArrowRight, LayoutGrid, Layers, User as UserIcon, X, Info, GraduationCap, Users, Megaphone, Bell, Download } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

const DAYS: DayName[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const TIME_SLOTS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export function RoomPublicSchedulePage() {
  const { id } = useParams<{ id: string }>(); // This can be UUID or Room Code
  const [room, setRoom] = useState<Room | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [academicLevels, setAcademicLevels] = useState<AcademicLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() > 4 ? 0 : new Date().getDay());
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        setLoading(true);
        let roomData: Room | null = null;
        
        // Try to fetch by code first (if it doesn't look like a UUID)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "");
        
        if (isUUID) {
          const roomRes = await api.get(`/rooms/${id}`);
          roomData = roomRes.data;
        } else {
          const roomRes = await api.get(`/rooms/code/${id}`);
          roomData = roomRes.data;
        }

        if (roomData) {
          setRoom(roomData);
          const [lecturesRes, announcementsRes, levelsRes] = await Promise.all([
            api.get(`/lectures?room_id=${roomData.id}`),
            api.get(`/announcements?department_id=${roomData.department_id || ''}`),
            api.get('/academic-levels')
          ]);
          setLectures(lecturesRes.data);
          setAnnouncements(announcementsRes.data);
          setAcademicLevels(levelsRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch room data', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchRoomData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">القاعة غير موجودة</h2>
        <Link to="/" className="text-indigo-600 hover:underline">العودة للرئيسية</Link>
      </div>
    );
  }

  const dayLectures = lectures.filter(l => l.day_of_week === selectedDay);

  const getLecturesForSlot = (day: number, time: string) => {
    const slotMin = timeToMinutes(time);
    return lectures.filter(l => {
      const lStart = timeToMinutes(l.start_time);
      return l.day_of_week === day && lStart >= slotMin && lStart < slotMin + 30;
    });
  };

  const isLectureSpanning = (day: number, time: string) => {
    const slotMin = timeToMinutes(time);
    return lectures.some(l => {
      const lStart = timeToMinutes(l.start_time);
      const lEnd = timeToMinutes(l.end_time);
      return l.day_of_week === day && slotMin > lStart && slotMin < lEnd;
    });
  };

  const handleDownloadPDF = async () => {
    if (!scheduleRef.current) return;
    
    setIsExporting(true);
    try {
      const element = scheduleRef.current;
      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#fff',
        pixelRatio: 2,
      });
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let finalWidth = pageWidth;
      let finalHeight = (imgProps.height * pageWidth) / imgProps.width;
      
      if (finalHeight > pageHeight) {
        finalHeight = pageHeight;
        finalWidth = (imgProps.width * pageHeight) / imgProps.height;
      }

      const xOffset = (pageWidth - finalWidth) / 2;
      
      pdf.addImage(dataUrl, 'PNG', xOffset, 0, finalWidth, finalHeight);
      pdf.save(`Room-Schedule-${room?.name}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error("PDF Export Error:", e);
      alert("فشل في تصدير الجدول بصيغة PDF. المشكلة قد تكون بسبب ألوان oklch المستخدمة في Tailwind v4.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Room Info Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">{room.name}</h1>
              <p className="text-gray-500 font-medium">سعة القاعة: {room.capacity} طالب</p>
            </div>
          </div>
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors">
            العودة للمنصة <ArrowRight className="w-4 h-4 rotate-180" />
          </Link>
        </div>

        {/* Announcements Section */}
        {announcements.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-gray-500 flex items-center gap-2 pr-2">
              <Megaphone className="w-4 h-4 text-orange-500" />
              إعلانات هامة
            </h3>
            <div className="grid gap-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-4 animate-in slide-in-from-right duration-500">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-orange-950">{ann.title}</h4>
                    <p className="text-sm text-orange-800 leading-relaxed font-medium">{ann.content}</p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-orange-600 font-bold">
                      <span>نُشر بواسطة: {ann.publisher_name} ({ann.publisher_role})</span>
                      <span>•</span>
                      <span>{new Date(ann.created_at).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Switcher */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            جدول المحاضرات
          </h2>
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex">
            <button 
              onClick={() => setViewMode('daily')}
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-lg transition-all",
                viewMode === 'daily' ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
              )}
            >اليومي</button>
            <button 
              onClick={() => setViewMode('weekly')}
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-lg transition-all",
                viewMode === 'weekly' ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
              )}
            >الأسبوعي</button>
          </div>
          <button 
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 transition-all font-bold text-sm disabled:opacity-50"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : <Download className="w-4 h-4 text-indigo-600" />}
            تنزيل PDF
          </button>
        </div>

        <div ref={scheduleRef}>
          {viewMode === 'daily' ? (
            <div className="space-y-4">
              {/* Day Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(i)}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-sm font-bold shrink-0 transition-all border",
                    selectedDay === i 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" 
                      : "bg-white border-gray-100 text-gray-400 hover:border-indigo-100"
                  )}
                >
                  {day === 'Sunday' ? 'الأحد' : day === 'Monday' ? 'الاثنين' : day === 'Tuesday' ? 'الثلاثاء' : day === 'Wednesday' ? 'الأربعاء' : 'الخميس'}
                </button>
              ))}
            </div>

            {/* Daily Schedule List */}
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
              {dayLectures.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <p className="italic">لا توجد محاضرات في هذا اليوم.</p>
                </div>
              ) : (
                dayLectures.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(l => (
                  <div 
                    key={l.id} 
                    onClick={() => setSelectedLecture(l)}
                    className="p-4 flex items-center gap-4 group hover:bg-indigo-50/50 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: l.color }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{l.course_name}</h4>
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold text-white bg-indigo-500 px-2 py-0.5 rounded-lg">
                            {academicLevels.find(lvl => lvl.level_number === l.academic_year)?.name_ar || `المرحلة ${l.academic_year}`}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{l.course_code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {l.start_time} - {l.end_time}
                        </div>
                        <div className="w-1 h-1 rounded-full bg-gray-200" />
                        <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                          {l.lecture_type === 'practical' ? (
                            <div className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                              <LayoutGrid className="w-3 h-3" /> عملي: {l.group_name}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              <Layers className="w-3 h-3" /> نظري: {l.section_name}
                            </div>
                          )}
                        </div>
                        <div className="w-1 h-1 rounded-full bg-gray-200" />
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <UserIcon className="w-3 h-3" />
                          <span className="font-bold">{l.teacher_name}</span>
                        </div>
                      </div>
                      {l.lecture_type === 'practical' && l.assistants && l.assistants.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="text-[10px] text-gray-400 font-bold">المساعدين:</span>
                          {l.assistants.map(a => (
                            <span key={a.id} className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100">
                              {a.full_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Weekly Grid View */
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="w-20 p-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-l border-gray-50">الوقت</th>
                    {DAYS.map(day => (
                      <th key={day} className="p-4 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">
                        {day === 'Sunday' ? 'الأحد' : day === 'Monday' ? 'الاثنين' : day === 'Tuesday' ? 'الثلاثاء' : day === 'Wednesday' ? 'الأربعاء' : 'الخميس'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {TIME_SLOTS.map(time => (
                    <tr key={time} className="hover:bg-gray-50/30 transition-colors">
                      <td className="p-2 text-center text-[10px] font-mono text-gray-400 bg-gray-50/30 border-l border-gray-50">{time}</td>
                      {[0,1,2,3,4].map(dayIdx => {
                        const slotLectures = getLecturesForSlot(dayIdx, time);
                        const spanning = isLectureSpanning(dayIdx, time);
                        if (spanning && slotLectures.length === 0) return <td key={dayIdx} className="p-1" />;
                        
                        return (
                          <td key={dayIdx} className="p-1 align-top relative" style={{ height: '50px' }}>
                            {slotLectures.map(l => {
                              const durationMin = timeToMinutes(l.end_time) - timeToMinutes(l.start_time);
                              const heightSlots = durationMin / 30;
                              return (
                                <div 
                                  key={l.id}
                                  onClick={() => setSelectedLecture(l)}
                                  className="absolute inset-x-1 rounded-lg p-2 text-[10px] z-10 border-r-4 shadow-sm overflow-hidden flex flex-col cursor-pointer hover:brightness-95 transition-all active:scale-95"
                                  style={{ 
                                    backgroundColor: l.color + '15',
                                    borderColor: l.color,
                                    height: `${heightSlots * 50 - 4}px`,
                                    color: l.color
                                  }}
                                >
                                  <p className="font-bold truncate leading-tight">{l.course_name}</p>
                                  <div className="flex justify-between items-center mt-0.5">
                                    <p className="text-[8px] opacity-70 truncate font-mono">{l.course_code}</p>
                                    <p className="text-[8px] font-bold bg-white/50 px-1 rounded">م{l.academic_year}</p>
                                  </div>
                                  <p className="text-[9px] mt-1 font-bold truncate opacity-90">الأستاذ: {l.teacher_name}</p>
                                  {l.lecture_type === 'practical' && l.assistants && l.assistants.length > 0 && (
                                    <p className="text-[8px] opacity-70 truncate italic">مساعد: {l.assistants.map(a => a.full_name).join(', ')}</p>
                                  )}
                                  <p className="text-[9px] mt-auto font-bold pt-1 border-t border-current/10">
                                    {l.lecture_type === 'practical' ? `C: ${l.group_name}` : `S: ${l.section_name}`}
                                  </p>
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>

        <div className="bg-indigo-600 rounded-2xl p-6 text-white text-center">
          <p className="text-white/80 text-sm mb-1">نظام إدارة الكلية الذكي</p>
          <p className="font-bold">جامعة بابل - كلية تكنولوجيا المعلومات</p>
        </div>
      </div>

      {/* Lecture Detail Modal */}
      {selectedLecture && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedLecture(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="relative h-32 flex items-end px-8 pb-4" style={{ backgroundColor: selectedLecture.color }}>
              <button 
                onClick={() => setSelectedLecture(null)}
                className="absolute top-4 left-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-white">
                <p className="text-xs font-bold opacity-80 mb-1 flex items-center gap-1 uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5" /> تفاصيل المحاضرة
                </p>
                <h3 className="text-2xl font-black">{selectedLecture.course_name}</h3>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">رمز المقرر</p>
                  <p className="font-mono font-bold text-indigo-600">{selectedLecture.course_code}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">المرحلة</p>
                  <p className="font-bold text-gray-900">
                    {academicLevels.find(lvl => lvl.level_number === selectedLecture.academic_year)?.name_ar || `المرحلة ${selectedLecture.academic_year}`}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">الأستاذ المحاضر</p>
                    <p className="font-bold text-gray-900">{selectedLecture.teacher_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">الوقت والفترة</p>
                    <p className="font-bold text-gray-900">{selectedLecture.start_time} - {selectedLecture.end_time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Users className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">النوع والجمهور</p>
                    <p className="font-bold text-gray-900 italic">
                      {selectedLecture.lecture_type === 'practical' ? `عملي (جروب ${selectedLecture.group_name})` : `نظري (شعبة ${selectedLecture.section_name})`}
                    </p>
                  </div>
                </div>
              </div>

              {selectedLecture.lecture_type === 'practical' && selectedLecture.assistants && selectedLecture.assistants.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-gray-400 font-bold mb-2 pr-2 italic">الأساتذة المساعدين:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedLecture.assistants.map(a => (
                      <span key={a.id} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold border border-purple-100">
                        {a.full_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-6 flex justify-end">
              <button 
                onClick={() => setSelectedLecture(null)}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-sm"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
