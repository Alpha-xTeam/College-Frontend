import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Lecture, DayName, Course, Room, Department, User, AcademicSection, AcademicGroup, AcademicLevel } from '@/types';
import { Calendar, ChevronLeft, ChevronRight, AlertTriangle, Plus, X, Clock, MapPin, User as UserIcon, Layers, LayoutGrid, Activity, Download, Trash2, ArrowRight, Users } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const DAYS: DayName[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_AR: Record<string, string> = {
  'Sunday': 'الأحد',
  'Monday': 'الاثنين',
  'Tuesday': 'الثلاثاء',
  'Wednesday': 'الأربعاء',
  'Thursday': 'الخميس',
  'Friday': 'الجمعة',
  'Saturday': 'السبت'
};
const DAY_START_MIN = 8 * 60; // 08:00
const DAY_END_MIN = 17 * 60; // 17:00
const TOTAL_MIN = DAY_END_MIN - DAY_START_MIN;

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const calculatePercent = (time: string) => {
  const min = timeToMinutes(time);
  const percent = ((min - DAY_START_MIN) / TOTAL_MIN) * 100;
  return Math.max(0, Math.min(100, percent));
};

const calculateWidth = (start: string, end: string) => {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  const width = ((e - s) / TOTAL_MIN) * 100;
  return Math.max(0, Math.min(100, width));
};

const detectConflicts = (lectures: Lecture[]) => {
  const conflictMap = new Map<string, string[]>();
  
  for (let i = 0; i < lectures.length; i++) {
    for (let j = i + 1; j < lectures.length; j++) {
      const l1 = lectures[i];
      const l2 = lectures[j];
      
      if (l1.day_of_week !== l2.day_of_week) continue;
      
      const s1 = timeToMinutes(l1.start_time);
      const e1 = timeToMinutes(l1.end_time);
      const s2 = timeToMinutes(l2.start_time);
      const e2 = timeToMinutes(l2.end_time);
      
      if (s1 < e2 && s2 < e1) {
        if (l1.room_id === l2.room_id) {
          const msg = `Room conflict with ${l2.course_code}`;
          conflictMap.set(l1.id, [...(conflictMap.get(l1.id) || []), msg]);
          conflictMap.set(l2.id, [...(conflictMap.get(l2.id) || []), `Room conflict with ${l1.course_code}`]);
        }
        if (l1.teacher_id === l2.teacher_id) {
          const msg = `Teacher conflict with ${l2.course_code}`;
          conflictMap.set(l1.id, [...(conflictMap.get(l1.id) || []), msg]);
          conflictMap.set(l2.id, [...(conflictMap.get(l2.id) || []), `Teacher conflict with ${l1.course_code}`]);
        }
      }
    }
  }
  return conflictMap;
};

export function SchedulePage() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>(searchParams.get('room_id') || 'all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [studyFilter, setStudyFilter] = useState<'all' | 'morning' | 'evening'>('all');
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const { data: lectures = [], isLoading: loadingLecs } = useQuery<Lecture[]>({
    queryKey: ['lectures'],
    queryFn: async () => (await api.get('/lectures')).data
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: async () => (await api.get('/courses')).data
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: async () => (await api.get('/rooms')).data
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['profiles'],
    queryFn: async () => (await api.get('/profiles')).data
  });

  const { data: sections = [] } = useQuery<AcademicSection[]>({
    queryKey: ['sections'],
    queryFn: async () => (await api.get('/sections')).data
  });

  const { data: groups = [] } = useQuery<AcademicGroup[]>({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data
  });

  const { data: academicLevels = [] } = useQuery<AcademicLevel[]>({
    queryKey: ['academic-levels'],
    queryFn: async () => (await api.get('/academic-levels')).data
  });

  const { data: reschedules = [], isLoading: loadingResch } = useQuery<any[]>({
    queryKey: ['reschedules', 'active'],
    queryFn: async () => (await api.get('/lectures/reschedules/active')).data
  });

  const loading = loadingLecs || loadingResch;

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await api.delete(`/lectures/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lectures'] });
      setSelectedLecture(null);
    },
    onError: (e) => {
      console.error("Error deleting lecture:", e);
      alert("Failed to delete lecture");
    }
  });

  // Sync roomFilter with searchParams
  useEffect(() => {
    const roomId = searchParams.get('room_id');
    if (roomId) {
      setRoomFilter(roomId);
    }
  }, [searchParams]);

  const canEdit = currentUser?.role === 'hod' || currentUser?.role === 'dean' || currentUser?.role === 'supervisor' || currentUser?.role === 'owner';

  const filteredLectures = useMemo(() => {
    let result = lectures;
    if (currentUser?.role === 'student') {
      result = result.filter(l => l.department_id === currentUser.department_id);
    } else if (currentUser?.role === 'teacher') {
      result = result.filter(l => l.teacher_id === currentUser.id);
    } else if (deptFilter !== 'all') {
      result = result.filter(l => String(l.department_id) === String(deptFilter));
    } else if (currentUser?.role === 'hod' || currentUser?.role === 'supervisor') {
      // Supervisors can see all or just their dept? User said "المشرف ايضا يجب ان ينربط بقسم"
      // So supervisor should be limited to their department too
      result = result.filter(l => String(l.department_id) === String(currentUser.department_id));
    }

    if (studyFilter !== 'all') {
      result = result.filter(l => l.study_type === studyFilter);
    }

    if (roomFilter !== 'all') {
      result = result.filter(l => l.room_id === roomFilter);
    }

    if (yearFilter !== 'all') {
      result = result.filter(l => String(l.academic_year) === yearFilter);
    }
    
    return result;
  }, [lectures, currentUser, deptFilter, studyFilter, roomFilter, yearFilter]);

  const conflicts = useMemo(() => detectConflicts(lectures), [lectures]);
  const conflictCount = new Set(Array.from(conflicts.keys())).size;

  const startOfWeek = useMemo(() => getStartOfWeek(viewDate), [viewDate]);

  const getDayLectures = (dayIdx: number) => {
    const targetDateObj = new Date(startOfWeek);
    targetDateObj.setDate(startOfWeek.getDate() + dayIdx);
    const targetDateStr = formatDate(targetDateObj);

    // 1. Start with regular filtered lectures for this day_of_week
    let dayLecs = filteredLectures.filter(l => l.day_of_week === dayIdx);

    // 2. Remove those that are "rescheduled FROM" this specific date
    dayLecs = dayLecs.filter(l => {
      const isPostponedFromToday = reschedules.some(r => 
        r.lecture_id === l.id && r.original_date === targetDateStr
      );
      return !isPostponedFromToday;
    });

    // 3. Add those that are "rescheduled TO" this specific date
    const toToday = reschedules.filter(r => r.new_date === targetDateStr);
    
    // Convert reschedules to Lecture format for rendering
    const mappedToToday: Lecture[] = toToday.map(r => ({
      ...r.lectures,
      id: `resch-${r.id}`,
      start_time: r.new_start_time.slice(0, 5),
      end_time: r.new_end_time.slice(0, 5),
      room_id: r.new_room_id,
      room_name: rooms.find(rm => rm.id === r.new_room_id)?.name || r.lectures?.room_name,
      is_rescheduled: true,
      reason: r.reason
    }));

    return [...dayLecs, ...mappedToToday];
  };

  const handleDownloadPDF = async () => {
    if (!scheduleRef.current) return;
    
    setIsExporting(true);
    try {
      const element = scheduleRef.current;
      
      // نحدد العرض والارتفاع الحقيقي للجدول حتى الأجزاء الما ظاهرة تطلع
      const originalWidth = element.scrollWidth;
      const originalHeight = element.scrollHeight;

      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#fff',
        pixelRatio: 2, // جودة أعلى
        width: originalWidth,
        height: originalHeight,
        style: {
          height: originalHeight + 'px',
          width: originalWidth + 'px',
          overflow: 'visible',
          transform: 'none'
        }
      });
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // حساب الأبعاد لتناسب الصفحة دون قطع
      let finalWidth = pageWidth;
      let finalHeight = (imgProps.height * pageWidth) / imgProps.width;
      
      // إذا كان الطول بعد التغيير أكبر من طول الورقة، نصغر العرض والطول نسبياً
      if (finalHeight > pageHeight) {
        finalHeight = pageHeight;
        finalWidth = (imgProps.width * pageHeight) / imgProps.height;
      }
      
      // توسيط الصورة بالصفحة
      const xOffset = (pageWidth - finalWidth) / 2;
      const yOffset = (pageHeight - finalHeight) / 2;
      
      pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      pdf.save(`Schedule-${formatDate(new Date())}.pdf`);
    } catch (e) {
      console.error("PDF Export Error:", e);
      alert("فشل في تصدير الجدول بصيغة PDF. المشكلة قد تكون بسبب ألوان oklch المستخدمة في Tailwind v4.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            الجدول الدراسي
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {currentUser?.role === 'student' ? 'جدول المحاضرات الأسبوعي الخاص بك' :
             currentUser?.role === 'teacher' ? 'جدول محاضرات التدريس الخاص بك' :
             'إدارة الجداول الدراسية للأقسام'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {(currentUser?.role === 'dean' || currentUser?.role === 'owner') && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-right font-bold"
              dir="rtl"
            >
              <option value="all">كل الأقسام</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name_ar || d.name}</option>
              ))}
            </select>
          )}

          <select
            value={studyFilter}
            onChange={(e) => setStudyFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-right"
            dir="rtl"
          >
            <option value="all">كل الدراسات</option>
            <option value="morning">دراسة صباحية</option>
            <option value="evening">دراسة مسائية</option>
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-right"
            dir="rtl"
          >
            <option value="all">كل المراحل</option>
            {academicLevels.map(lvl => (
              <option key={lvl.id} value={String(lvl.level_number)}>{lvl.name_ar}</option>
            ))}
          </select>

          <select
            value={roomFilter}
            onChange={(e) => {
              const val = e.target.value;
              setRoomFilter(val);
              if (val === 'all') {
                searchParams.delete('room_id');
              } else {
                searchParams.set('room_id', val);
              }
              setSearchParams(searchParams);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-right"
            dir="rtl"
          >
            <option value="all">كل القاعات</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <div className="flex bg-gray-100/80 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setViewMode('weekly')}
              className={cn("px-4 py-1.5 text-sm font-bold rounded-lg transition-all", viewMode === 'weekly' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500')}
            >أسبوعي</button>
            <button
              onClick={() => setViewMode('daily')}
              className={cn("px-4 py-1.5 text-sm font-bold rounded-lg transition-all", viewMode === 'daily' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500')}
            >يومي</button>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : <Download className="w-4 h-4 text-indigo-600" />}
            تنزيل PDF
          </button>

          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
            >
              <Plus className="w-5 h-5" /> إضافة محاضرة
            </button>
          )}
          {roomFilter !== 'all' && (
            <button
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Activity className="w-4 h-4 text-indigo-600" /> رمز QR للقاعة
            </button>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && roomFilter !== 'all' && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowQRModal(false)}>
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl text-center relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2">
              <X className="w-6 h-6" />
            </button>
            <div className="mb-6">
              <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900">{rooms.find(r => r.id === roomFilter)?.name}</h3>
              <p className="text-gray-500 text-sm mt-1">امسح الكود لعرض جدول القاعة اليومي</p>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-gray-100 inline-block">
              <QRCodeSVG 
                value={`${window.location.origin}/room/${rooms.find(r => r.id === roomFilter)?.code || roomFilter}`} 
                size={200}
                includeMargin={true}
                level="H"
              />
            </div>

            <div className="mt-8 space-y-3">
              <button 
                onClick={() => {
                  const room = rooms.find(r => r.id === roomFilter);
                  window.open(`${window.location.origin}/room/${room?.code || roomFilter}`, '_blank');
                }}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                فتح صفحة الجدول
              </button>
              <p className="text-[10px] text-gray-400">نظام إدارة الكلية - جامعة بابل</p>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Warning */}
      {conflictCount > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm" dir="rtl">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-red-800">تم كشف تضاربات في الجدول</p>
            <p className="text-sm text-red-600 font-bold">يوجد {conflictCount} محاضرة تعاني من تضارب في الوقت أو القاعة. يرجى معالجتها لتجنب المشاكل.</p>
          </div>
        </div>
      )}

      {/* Reschedules Section */}
      {reschedules.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3 shadow-sm" dir="rtl">
          <div className="flex items-center gap-2 text-amber-800 font-black">
            <Clock className="w-5 h-5" />
            <h3>المحاضرات المؤجلة (قريباً)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reschedules.map(r => (
              <div key={r.id} className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
                    {r.lectures?.courses?.name_ar || 'محاضرة مؤجلة'}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">{r.new_date}</span>
                </div>
                <p className="text-xs text-gray-700 font-bold">
                  من: {r.original_date} ⬅️ إلى: {r.new_date}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                  <MapPin className="w-3 h-3" /> {r.lectures?.rooms?.name}
                  <Clock className="w-3 h-3" /> {r.new_start_time.slice(0, 5)} - {r.new_end_time.slice(0, 5)}
                </div>
                <div className="text-[10px] bg-gray-50 p-2 rounded-lg text-gray-600 italic">
                  السبب: {r.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily View Controls */}
      {viewMode === 'daily' && (
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
          <button 
            onClick={() => {
              const prev = new Date(viewDate);
              prev.setDate(prev.getDate() - 1);
              setViewDate(prev);
            }} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          </button>
          <div className="flex flex-col items-center min-w-[140px]">
            <h3 className="text-lg font-black text-gray-900">{DAYS_AR[DAYS[viewDate.getDay()]]}</h3>
            <span className="text-[10px] text-gray-400 font-bold">{formatDate(viewDate)}</span>
          </div>
          <button 
            onClick={() => {
              const next = new Date(viewDate);
              next.setDate(next.getDate() + 1);
              setViewDate(next);
            }} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
          </button>
          <div className="flex gap-1 mr-4 overflow-x-auto pb-1 no-scrollbar">
            {DAYS.map((d, i) => {
              const dDate = new Date(startOfWeek);
              dDate.setDate(startOfWeek.getDate() + i);
              const isActive = formatDate(dDate) === formatDate(viewDate);
              return (
                <button
                  key={d}
                  onClick={() => {
                    setViewDate(dDate);
                  }}
                  className={cn("px-4 py-2 text-sm rounded-xl font-bold transition-all whitespace-nowrap",
                    isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-100'
                  )}
                >
                  {DAYS_AR[d]}
                  <span className="block text-[8px] opacity-60">{dDate.getDate()}/{dDate.getMonth() + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule Grid */}
      <div ref={scheduleRef} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm" dir="rtl">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px] flex flex-col">
            {/* Time Header */}
            <div className="flex border-b border-gray-200 bg-gray-50/80 sticky top-0 z-20 backdrop-blur-sm">
              <div className="w-28 shrink-0 border-l border-gray-200 py-3 px-4 text-xs font-black text-gray-500 text-center uppercase tracking-wider">
                {viewMode === 'weekly' ? 'الأسبوع الحالي' : 'اليوم'}
              </div>
              <div className="flex-1 relative h-10">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] text-gray-400 font-bold">المخطط الزمني للمحاضرات</span>
                </div>
              </div>
            </div>

            {/* Days Rows */}
            <div className="flex flex-col">
              {(viewMode === 'weekly' ? DAYS : [DAYS[viewDate.getDay()]]).map((day, idx) => {
                const dayIdx = viewMode === 'weekly' ? idx : viewDate.getDay();
                const dayLectures = getDayLectures(dayIdx);
                const targetDate = new Date(startOfWeek);
                targetDate.setDate(startOfWeek.getDate() + dayIdx);
                
                return (
                  <div key={day} className="flex border-b border-gray-100 last:border-b-0 min-h-[140px] group relative">
                    {/* Day Label */}
                    <div className="w-28 shrink-0 border-l border-gray-200 bg-gray-50/30 flex flex-col items-center justify-center gap-1 group-hover:bg-indigo-50/50 transition-colors">
                      <span className="text-sm font-black text-gray-700">{DAYS_AR[day]}</span>
                      <span className="text-[10px] text-gray-500 font-bold">{targetDate.getDate()}/{targetDate.getMonth() + 1}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{dayLectures.length} محاضرة</span>
                    </div>

                    {/* Timeline Container */}
                    <div className="flex-1 relative bg-white/50 bg-[linear-gradient(to_left,transparent_99%,#f1f5f9_99%)] bg-[length:11.11%_100%] overflow-hidden py-4">
                      {dayLectures.map(lecture => {
                        const leftPos = calculatePercent(lecture.start_time);
                        const width = calculateWidth(lecture.start_time, lecture.end_time);
                        const hasConflict = conflicts.has(lecture.id) && !lecture.is_rescheduled;
                        
                        return (
                          <div
                            key={lecture.id}
                            className="absolute h-[calc(100%-32px)] top-4 transition-all hover:z-30 px-1"
                            style={{ 
                              right: `${leftPos}%`, 
                              width: `${width}%`,
                            }}
                          >
                            <button
                              onClick={() => setSelectedLecture(lecture)}
                              className={cn(
                                "w-full h-full rounded-xl p-2 text-right transition-all hover:scale-[1.02] hover:shadow-xl border-t-4 active:scale-95 flex flex-col items-start justify-between overflow-hidden shadow-sm",
                                hasConflict ? "ring-2 ring-red-500 ring-offset-2 animate-pulse" : "ring-1 ring-black/5",
                                lecture.is_rescheduled && "ring-2 ring-amber-400 ring-offset-1 border-dashed"
                              )}
                              style={{
                                backgroundColor: lecture.color + (lecture.is_rescheduled ? '25' : '15'),
                                borderTopColor: lecture.color,
                              }}
                            >
                              <div className="w-full">
                                <div className="flex items-center justify-between w-full mb-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-white/80 shadow-sm" style={{ color: lecture.color }}>
                                      {lecture.course_code}
                                    </span>
                                    {lecture.is_rescheduled && (
                                      <span className="text-[8px] bg-amber-500 text-white px-1 py-0.5 rounded font-black flex items-center gap-0.5">
                                        <Clock className="w-2 h-2" /> مؤجلة
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[8px] font-bold text-gray-400">م{lecture.academic_year}</span>
                                </div>
                                <h4 className="text-[11px] font-black text-gray-800 line-clamp-2 leading-tight">
                                  {lecture.course_name}
                                </h4>
                              </div>

                              <div className="w-full mt-auto space-y-1">
                                <div className="flex items-center gap-1 text-gray-500">
                                  <UserIcon className="w-2.5 h-2.5" />
                                  <span className="text-[10px] font-bold truncate">{lecture.teacher_name}</span>
                                </div>
                                <div className="flex items-center justify-between gap-1 w-full bg-white/40 rounded-lg p-1">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5 text-indigo-500" />
                                    <span className="text-[9px] font-black text-indigo-700">{lecture.room_name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[9px] text-gray-500 font-black bg-white/60 px-1.5 py-0.5 rounded-md">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{lecture.start_time} - {lecture.end_time}</span>
                                  </div>
                                </div>
                              </div>
                              
                              {hasConflict && (
                                <div className="absolute top-1 left-1 bg-red-500 rounded-full p-0.5 shadow-lg">
                                  <AlertTriangle className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Lecture Detail Modal */}
      {selectedLecture && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300" onClick={() => setSelectedLecture(null)}>
          <div className="bg-white rounded-[2.5rem] max-w-md w-full overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Modal Header with Gradient */}
            <div className={cn(
              "p-8 pb-12 relative overflow-hidden",
              selectedLecture.study_type === 'morning' 
                ? "bg-gradient-to-br from-indigo-600 to-violet-700" 
                : "bg-gradient-to-br from-slate-800 to-slate-900"
            )}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-wider border border-white/10">
                      {selectedLecture.course_code}
                    </span>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      selectedLecture.study_type === 'morning' ? "bg-blue-400/30 text-blue-50" : "bg-amber-400/30 text-amber-50"
                    )}>
                      {selectedLecture.study_type === 'morning' ? 'صباحي' : 'مسائي'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white leading-tight mt-2">{selectedLecture.course_name}</h3>
                </div>
                <button 
                  onClick={() => setSelectedLecture(null)} 
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all hover:rotate-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-8 pb-8 -mt-8 relative z-10">
              <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-50 space-y-5">
                {/* Info Grid */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">الوقت واليوم</p>
                      <p className="font-bold text-slate-700">{DAYS_AR[DAYS[selectedLecture.day_of_week]]}، {selectedLecture.start_time} - {selectedLecture.end_time}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">المكان</p>
                      <button 
                        onClick={() => {
                          setRoomFilter(selectedLecture.room_id);
                          searchParams.set('room_id', selectedLecture.room_id);
                          setSearchParams(searchParams);
                          setSelectedLecture(null);
                        }}
                        className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group/link"
                      >
                        {selectedLecture.room_name}
                        <ArrowRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">التدريسي</p>
                      <p className="font-bold text-slate-700">{selectedLecture.teacher_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
                      {selectedLecture.lecture_type === 'practical' ? <LayoutGrid className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">تفاصيل الحضور</p>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">
                          {selectedLecture.lecture_type === 'practical' ? 'عملي' : 'نظري'}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="font-bold text-indigo-600">
                          {selectedLecture.lecture_type === 'practical' 
                            ? `جروب ${selectedLecture.group_name || 'غير محدد'}` 
                            : `شعبة ${selectedLecture.section_name || 'غير محدد'}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assistants Section */}
                {selectedLecture.assistants && selectedLecture.assistants.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Users className="w-3 h-3" /> التدريسيين المساعدين
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedLecture.assistants.map(a => (
                        <div key={a.id} className="bg-white px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 shadow-sm flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                           {a.full_name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conflicts Area */}
                {conflicts.has(selectedLecture.id) && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 animate-pulse">
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-black uppercase">Conflict Warning</span>
                    </div>
                    <div className="space-y-1">
                      {conflicts.get(selectedLecture.id)?.map((c, i) => (
                        <p key={i} className="text-xs text-red-700 font-bold leading-relaxed">• {c}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {canEdit && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={() => setShowRescheduleModal(true)}
                      className="flex flex-col items-center justify-center gap-1 p-3 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-2xl transition-all group/btn"
                    >
                      <Clock className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase">تأجيل</span>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('هل أنت متأكد من حذف هذه المحاضرة؟')) {
                          deleteMutation.mutate(selectedLecture.id);
                        }
                      }}
                      className="flex flex-col items-center justify-center gap-1 p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all group/btn"
                    >
                      <Trash2 className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase">حذف</span>
                    </button>
                    <button
                      onClick={() => setSelectedLecture(null)}
                      className="flex flex-col items-center justify-center gap-1 p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all group/btn"
                    >
                      <X className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase">إغلاق</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedLecture && (
        <RescheduleModal 
          lecture={selectedLecture}
          rooms={rooms}
          defaultDate={formatDate(viewDate)}
          onClose={() => setShowRescheduleModal(false)}
          onSuccess={() => {
            setShowRescheduleModal(false);
            setSelectedLecture(null);
            queryClient.invalidateQueries({ queryKey: ['lectures'] });
            queryClient.invalidateQueries({ queryKey: ['reschedules'] });
          }}
        />
      )}

      {/* Add Lecture Modal */}
      {showAddModal && (
        <AddLectureModal 
          onClose={() => setShowAddModal(false)} 
          onAdd={async () => { 
            queryClient.invalidateQueries({ queryKey: ['lectures'] });
            setShowAddModal(false); 
          }} 
          allLectures={lectures}
          courses={courses}
          rooms={rooms}
          users={users}
          sections={sections}
          groups={groups}
          academicLevels={academicLevels}
        />
      )}
    </div>
  );
}

function RescheduleModal({ 
  lecture, 
  rooms, 
  defaultDate,
  onClose, 
  onSuccess 
}: { 
  lecture: Lecture; 
  rooms: Room[]; 
  defaultDate: string;
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [originalDate, setOriginalDate] = useState(defaultDate);
  const [newDate, setNewDate] = useState('');
  const [startTime, setStartTime] = useState(lecture.start_time);
  const [endTime, setEndTime] = useState(lecture.end_time);
  const [roomId, setRoomId] = useState(lecture.room_id);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const rescheduleMutation = useMutation({
    mutationFn: async (data: any) => await api.post('/lectures/reschedule', data),
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'فشل في تأجيل المحاضرة');
    }
  });

  const handleReschedule = async () => {
    if (!newDate || !reason) {
      setError('يرجى اختيار التاريخ وكتابة سبب التأجيل');
      return;
    }
    setError('');
    rescheduleMutation.mutate({
      lecture_id: lecture.id,
      original_date: originalDate,
      new_date: newDate,
      new_start_time: startTime,
      new_end_time: endTime,
      new_room_id: roomId,
      reason
    });
  };

  const loading = rescheduleMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose} dir="rtl">
      <div className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-8 left-8 text-gray-400 hover:text-gray-600 p-1">
          <X className="w-6 h-6" />
        </button>

        <div className="mb-8">
          <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            تأجيل محاضرة
          </h3>
          <p className="text-gray-500 mt-2 font-medium">مادة: {lecture.course_name}</p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">التاريخ الأصلي</label>
              <input
                type="date"
                value={originalDate}
                onChange={e => setOriginalDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">التاريخ الجديد</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">وقت البدء</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">وقت الانتهاء</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">القاعة الجديدة</label>
            <select
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 font-bold appearance-none"
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.building})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">سبب التأجيل</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="اكتب سبب التأجيل هنا... (مثلاً: عطلة رسمية، ظرف طارئ، إلخ)"
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 font-bold resize-none"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleReschedule}
            disabled={loading}
            className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black shadow-xl shadow-amber-100 hover:bg-amber-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : <Clock className="w-5 h-5" />}
            تأكيد التأجيل
          </button>
        </div>
      </div>
    </div>
  );
}

function AddLectureModal({ 
  onClose, 
  onAdd, 
  allLectures,
  courses,
  rooms,
  users,
  sections,
  groups,
  academicLevels
}: { 
  onClose: () => void; 
  onAdd: () => void; 
  allLectures: Lecture[];
  courses: Course[];
  rooms: Room[];
  users: User[];
  sections: AcademicSection[];
  groups: AcademicGroup[];
  academicLevels: AcademicLevel[];
}) {
  const { currentUser } = useAuth();
  const [courseId, setCourseId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [day, setDay] = useState(0);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [academicYear, setAcademicYear] = useState(1);
  const [lectureType, setLectureType] = useState<'theoretical' | 'practical'>('theoretical');
  const [studyType, setStudyType] = useState<'morning' | 'evening'>('morning');
  const [sectionId, setSectionId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [assistantIds, setAssistantIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const addMutation = useMutation({
    mutationFn: async (data: any) => await api.post('/lectures', data),
    onSuccess: () => {
      onAdd();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'فشل في إضافة المحاضرة');
    }
  });

  const availableCourses = currentUser?.role === 'hod'
    ? courses.filter(c => c.department_id === currentUser.department_id)
    : courses;

  const availableRooms = (currentUser?.role === 'hod' || currentUser?.role === 'supervisor')
    ? rooms.filter(r => !r.department_id || String(r.department_id) === String(currentUser.department_id))
    : rooms;

  const currentCourse = courses.find(c => c.id === courseId);
  const targetDeptId = currentUser?.department_id || currentCourse?.department_id;

  const filteredSections = sections.filter(s => String(s.department_id) === String(targetDeptId));
  const filteredGroups = groups.filter(g => String(g.department_id) === String(targetDeptId));

  const handleAdd = async () => {
    if (!courseId || !roomId) { setError('Please select a course and room.'); return; }
    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) { setError('End time must be after start time.'); return; }
    
    const course = courses.find(c => c.id === courseId);
    const room = rooms.find(r => r.id === roomId);
    const teacher = users.find(u => u.id === course?.teacher_id);
    
    if (!course || !room || !teacher) {
      setError('Selected data is invalid.');
      return;
    }

    if (lectureType === 'practical' && assistantIds.length === 0) {
      setError('المحاضرة العملية يجب أن تحتوي على تدريسي مساعد واحد على الأقل.');
      return;
    }

    // Check conflicts locally first
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);
    for (const l of allLectures) {
      if (l.day_of_week !== day) continue;
      const lStart = timeToMinutes(l.start_time);
      const lEnd = timeToMinutes(l.end_time);
      if (newStart < lEnd && lStart < newEnd) {
        if (l.room_id === roomId) {
          setError(`تضارب في القاعة: ${room.name} محجوزة مسبقاً من ${l.start_time} إلى ${l.end_time} لمادة ${l.course_name}`);
          return;
        }
        
        // Check primary teacher
        if (l.teacher_id === course.teacher_id || l.assistants?.some(a => a.id === course.teacher_id)) {
          setError(`تضارب في الأستاذ الأساسي: ${teacher.full_name} لديه التزام في ${l.start_time}-${l.end_time}`);
          return;
        }

        // Check new assistants
        if (lectureType === 'practical') {
          for (const aid of assistantIds) {
            if (l.teacher_id === aid || l.assistants?.some(a => a.id === aid)) {
              const aName = users.find(u => u.id === aid)?.full_name || 'المساعد';
              setError(`تضارب: التدريسي المساعد ${aName} لديه التزام في هذا الوقت.`);
              return;
            }
          }
        }
      }
    }

    setError('');

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
    
    addMutation.mutate({
      course_id: courseId,
      teacher_id: course.teacher_id,
      room_id: roomId,
      academic_year: academicYear,
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
      department_id: course.department_id,
      lecture_type: lectureType,
      study_type: studyType,
      section_id: lectureType === 'theoretical' ? (sectionId || null) : null,
      group_id: lectureType === 'practical' ? (groupId || null) : null,
      assistant_ids: lectureType === 'practical' ? assistantIds : [],
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
  };

  const submitting = addMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Add New Lecture</h3>
          <button onClick={onClose} disabled={submitting} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
              <select 
                value={courseId} 
                onChange={e => setCourseId(e.target.value)} 
                disabled={submitting}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select course...</option>
                {availableCourses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <select 
                value={roomId} 
                onChange={e => setRoomId(e.target.value)} 
                disabled={submitting}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 text-right"
                dir="rtl"
              >
                <option value="">اختر القاعة...</option>
                {availableRooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.building})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الدراسة</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStudyType('morning')}
                    className={cn(
                      "py-2 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2",
                      studyType === 'morning' ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold" : "border-gray-100 text-gray-500 hover:border-gray-200"
                    )}
                  >
                    صباحي
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudyType('evening')}
                    className={cn(
                      "py-2 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2",
                      studyType === 'evening' ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold" : "border-gray-100 text-gray-500 hover:border-gray-200"
                    )}
                  >
                    مسائي
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المرحلة الدراسية</label>
                <select
                  value={academicYear}
                  onChange={e => setAcademicYear(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-[42px] focus:ring-2 focus:ring-indigo-500 text-right"
                  dir="rtl"
                >
                  {academicLevels.map(lvl => (
                    <option key={lvl.id} value={lvl.level_number}>{lvl.name_ar}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right" dir="rtl">نوع المحاضرة</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLectureType('theoretical');
                      setAssistantIds([]);
                    }}
                    className={cn(
                      "py-2 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2",
                      lectureType === 'theoretical' ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold" : "border-gray-100 text-gray-500 hover:border-gray-200"
                    )}
                  >
                    نظرية
                  </button>
                  <button
                    type="button"
                    onClick={() => setLectureType('practical')}
                    className={cn(
                      "py-2 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2",
                      lectureType === 'practical' ? "border-purple-600 bg-purple-50 text-purple-700 font-bold" : "border-gray-100 text-gray-500 hover:border-gray-200"
                    )}
                  >
                    عملي
                  </button>
                </div>
              </div>
            </div>

            {lectureType === 'theoretical' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الشعبة (رقم الشعبة)</label>
                <select 
                  value={sectionId} 
                  onChange={e => setSectionId(e.target.value)} 
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 text-right"
                  dir="rtl"
                >
                  <option value="">اختر الشعبة...</option>
                  {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الكروب</label>
                  <select 
                    value={groupId} 
                    onChange={e => setGroupId(e.target.value)} 
                    disabled={submitting}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 text-right"
                    dir="rtl"
                  >
                    <option value="">اختر الكروب...</option>
                    {filteredGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right" dir="rtl">التدريسيين المساعدين</label>
                  <div className="space-y-2 h-[100px] overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                    {users.filter(u => u.role === 'teacher' && u.id !== courses.find(c => c.id === courseId)?.teacher_id).map(u => (
                      <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={assistantIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setAssistantIds([...assistantIds, u.id]);
                            else setAssistantIds(assistantIds.filter(id => id !== u.id));
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{u.full_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اليوم</label>
              <select 
                value={day} 
                onChange={e => setDay(Number(e.target.value))} 
                disabled={submitting}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 text-right"
                dir="rtl"
              >
                {DAYS.map((d, i) => <option key={d} value={i}>{DAYS_AR[d]}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input 
                  type="time" 
                  value={startTime} 
                  onChange={e => setStartTime(e.target.value)} 
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input 
                  type="time" 
                  value={endTime} 
                  onChange={e => setEndTime(e.target.value)} 
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3 shrink-0 bg-gray-50/50">
          <button 
            onClick={onClose} 
            disabled={submitting}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >Cancel</button>
          <button 
            onClick={handleAdd} 
            disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
          >
            {submitting ? 'Adding...' : 'Add Lecture'}
          </button>
        </div>
      </div>
    </div>
  );
}
