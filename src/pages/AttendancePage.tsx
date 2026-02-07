import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import type { AttendanceSession, AttendanceLog, Lecture, User } from '@/types';
import {
  ClipboardCheck, Play, Square, CheckCircle2, XCircle, Clock,
  TrendingUp, AlertCircle, Radio, Loader2, QrCode, RefreshCcw, Camera
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';

export function AttendancePage() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  // Student role sees the scanning interface
  if (currentUser.role === 'student') {
    return <StudentAttendance />;
  }

  // Any other role (teacher, dean, owner) sees the management interface
  return <TeacherAttendance />;
}

function TeacherAttendance() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [showQrModal, setShowQrModal] = useState<AttendanceSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [qrDuration, setQrDuration] = useState<number>(10); // Default to 10 minutes

  // Timer logic for QR expiry
  useEffect(() => {
    if (!showQrModal?.expires_at) return;
    
    const interval = setInterval(() => {
      const expiry = new Date(showQrModal.expires_at!).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(diff);
      
      if (diff === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showQrModal]);
  const { data: myLectures = [], isLoading: loadingLecs } = useQuery<Lecture[]>({
    queryKey: ['lectures', 'teacher', currentUser?.id],
    queryFn: async () => (await api.get(`/lectures/teacher/${currentUser?.id}`)).data,
    enabled: !!currentUser?.id
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<AttendanceSession[]>({
    queryKey: ['attendance', 'sessions', 'teacher', currentUser?.id],
    queryFn: async () => (await api.get('/attendance/sessions', { params: { teacher_id: currentUser?.id } })).data,
    enabled: !!currentUser?.id
  });

  const { data: activeSessions = [], isLoading: loadingActive } = useQuery<AttendanceSession[]>({
    queryKey: ['attendance', 'sessions', 'active', 'teacher', currentUser?.id],
    queryFn: async () => (await api.get('/attendance/sessions/active', { params: { teacher_id: currentUser?.id } })).data,
    enabled: !!currentUser?.id
  });

  const { data: deptStudents = [], isLoading: loadingStudents } = useQuery<User[]>({
    queryKey: ['profiles', 'students', 'department', currentUser?.department_id],
    queryFn: async () => {
      const res = await api.get('/profiles');
      return res.data.filter((u: User) => u.role === 'student' && u.department_id === currentUser?.department_id);
    },
    enabled: !!currentUser?.department_id
  });

  const { data: sessionLogs = [] } = useQuery<AttendanceLog[]>({
    queryKey: ['attendance', 'logs', 'session', selectedSession?.id || showQrModal?.id],
    queryFn: async () => (await api.get(`/attendance/sessions/${selectedSession?.id || showQrModal?.id}/logs`)).data,
    enabled: !!selectedSession?.id || !!showQrModal?.id
  });

  // Mutations
  const toggleSessionMutation = useMutation({
    mutationFn: async ({ lectureId, activeSessionId }: { lectureId: string, activeSessionId?: string }) => {
      if (activeSessionId) {
        return await api.post(`/attendance/sessions/${activeSessionId}/close`);
      } else {
        const res = await api.post('/attendance/sessions', {
          lecture_id: lectureId,
          date: new Date().toISOString().split('T')[0],
          teacher_id: currentUser?.id,
          duration_minutes: qrDuration
        });
        return res.data;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'sessions'] });
      // If we just opened a session, show the QR modal
      if (!variables.activeSessionId) {
        setShowQrModal(data);
      } else {
        setShowQrModal(null);
      }
    }
  });

  const refreshQrMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.post(`/attendance/sessions/${sessionId}/refresh-qr`, {
        duration_minutes: qrDuration
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'sessions'] });
      setShowQrModal(data);
    }
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async ({ sessionId, studentId, status }: { sessionId: string, studentId: string, status: string }) => {
      return await api.post('/attendance/logs', {
        session_id: sessionId,
        student_id: studentId,
        status: status
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'logs', 'session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'sessions'] }); // Update counts
    }
  });

  const toggleSession = (lectureId: string) => {
    const active = activeSessions.find(s => s.lecture_id === lectureId);
    toggleSessionMutation.mutate({ lectureId, activeSessionId: active?.id });
  };

  const markStudentAttendance = (sessionId: string, studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    markAttendanceMutation.mutate({ sessionId, studentId, status });
  };

  const loading = loadingLecs || loadingSessions || loadingActive || loadingStudents;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            إدارة الحضور والغياب
          </h1>
          <p className="text-gray-500 mt-2 font-medium">افتح جلسات الحضور وتابع تسجيل الطلاب بشكل مباشر</p>
        </div>
      </div>

      {/* Active Sessions Banner - Modernized */}
      {activeSessions.length > 0 && (
        <div className="relative overflow-hidden bg-white border border-green-100 rounded-3xl p-6 shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center p-1.5 bg-green-100 text-green-600 rounded-lg">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">الجلسات المفتوحة حالياً ({activeSessions.length})</h3>
              </div>
              <p className="text-gray-500 text-sm">لديك محاضرات جاري تسجيل الحضور فيها الآن.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {activeSessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className="bg-green-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-green-700 transition-all shadow-md shadow-green-100 flex items-center gap-2"
                >
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  {(s as any).lectures?.courses?.name_ar || (s as any).lectures?.courses?.name || 'جلسة نشطة'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lecture Cards - Modernized */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-1">
          <h2 className="text-xl font-black text-gray-900">محاضراتي اليوم</h2>
          
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">مدة صلاحية الكود:</span>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min="1" 
                max="60" 
                value={qrDuration}
                onChange={(e) => setQrDuration(parseInt(e.target.value) || 5)}
                className="w-16 bg-gray-50 border-none rounded-xl px-3 py-1 text-center font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <span className="text-xs font-bold text-gray-500">دقيقة</span>
            </div>
          </div>
        </div>

        {myLectures.length === 0 ? (
          <div className="bg-gray-50 rounded-[2rem] p-16 text-center border-2 border-dashed border-gray-200">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-gray-900">لا توجد محاضرات في الجدول</h3>
            <p className="text-gray-500 mt-1 font-medium">لم يتم العثور على أي محاضرات مسندة إليك حالياً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myLectures.map(lecture => {
              const activeSession = activeSessions.find(s => s.lecture_id === lecture.id);
              const totalSessions = sessions.filter(s => s.lecture_id === lecture.id).length;
              return (
                <div key={lecture.id} className={cn(
                  "group relative overflow-hidden bg-white rounded-[2rem] border-2 p-6 transition-all",
                  activeSession 
                    ? "border-green-500 shadow-xl shadow-green-50" 
                    : "border-gray-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50"
                )}>
                  {activeSession && (
                    <div className="absolute top-0 left-0 w-2 h-full bg-green-500" />
                  )}
                  
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div className={cn(
                        "p-3 rounded-2xl mb-4",
                        activeSession ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors"
                      )}>
                        <ClipboardCheck className="w-6 h-6" />
                      </div>
                      {activeSession && (
                        <span className="animate-pulse flex items-center gap-1.5 text-[10px] bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-black uppercase tracking-wider">
                          مباشر الآن
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-gray-900 text-lg mb-1 group-hover:text-indigo-600 transition-colors">
                      {(lecture as any).courses?.name_ar || (lecture as any).courses?.name || 'المادة'}
                    </h3>
                    
                    <div className="space-y-2 mb-6">
                      <p className="text-xs text-gray-500 font-bold flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {lecture.start_time} - {lecture.end_time}
                      </p>
                      <p className="text-xs text-gray-400 font-medium flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5" />
                        {(lecture as any).rooms?.name} • {['الأحد', 'الأثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'][lecture.day_of_week]}
                      </p>
                    </div>

                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50 group-hover:border-indigo-50 transition-colors">
                      <div className="flex items-center gap-2">
                        {activeSession && (
                          <button
                            onClick={() => setShowQrModal(activeSession)}
                            className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all shadow-sm active:scale-95"
                            title="عرض كود QR"
                          >
                            <QrCode className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => toggleSession(lecture.id)}
                          className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-md active:scale-95",
                            activeSession
                              ? "bg-red-50 text-red-600 hover:bg-red-100 shadow-red-50"
                              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
                          )}
                        >
                          {activeSession ? <><Square className="w-4 h-4" /> إنهاء</> : <><Play className="w-4 h-4" /> فتح الحضور</>}
                        </button>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">الجلسات</p>
                        <p className="font-black text-xs text-gray-600">{totalSessions}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Session History - Modernized List */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-gray-900 px-1">سجل الجلسات السابقة</h2>
        <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-5 px-6 font-black text-gray-400 uppercase tracking-widest text-xs">المادة</th>
                  <th className="py-5 px-6 font-black text-gray-400 uppercase tracking-widest text-xs">التاريخ</th>
                  <th className="py-5 px-6 font-black text-gray-400 uppercase tracking-widest text-xs">الحالة</th>
                  <th className="py-5 px-6 font-black text-gray-400 uppercase tracking-widest text-xs">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-gray-400 font-medium italic">لا يوجد سجل للحضور بعد</td>
                  </tr>
                ) : (
                  sessions.map(session => {
                    return (
                      <tr key={session.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:shadow-sm transition-all font-bold">
                              {(session as any).lectures?.courses?.name?.charAt(0)}
                            </div>
                            <span className="font-bold text-gray-900">{(session as any).lectures?.courses?.name_ar || (session as any).lectures?.courses?.name}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-gray-500 font-medium">{session.date}</td>
                        <td className="py-5 px-6">
                          {session.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-black uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> نشط
                            </span>
                          ) : (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full font-black uppercase tracking-wider">مغلق</span>
                          )}
                        </td>
                        <td className="py-5 px-6 text-left">
                          <button
                            onClick={() => setSelectedSession(session)}
                            className="bg-white border border-gray-200 text-indigo-600 hover:border-indigo-600 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95"
                          >
                            عرض التفاصيل
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Session Detail Modal - Modernized */}
      {selectedSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedSession(null)}>
          <div className="bg-white rounded-[2.5rem] max-w-2xl w-full p-8 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col transition-all" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-start justify-between mb-8">
              <div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full mb-2 inline-block">تفاصيل الجلسة</span>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">{(selectedSession as any).lectures?.courses?.name_ar || (selectedSession as any).lectures?.courses?.name}</h3>
                <p className="text-sm text-gray-400 font-bold mt-1 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {selectedSession.date} • {selectedSession.is_active ? 'نشطة حالياً' : 'مغلقة'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedSession(null)} 
                className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              <div className="flex items-center justify-between p-2 mb-2 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                <span>الطالب</span>
                <span>الحالة والتسجيل</span>
              </div>
              {deptStudents.length === 0 ? (
                <div className="text-center py-16 text-gray-400 font-medium italic">لا يوجد طلاب مسجلين في هذا القسم</div>
              ) : (
                deptStudents.sort((a, b) => (a.full_name_ar || a.full_name || '').localeCompare(b.full_name_ar || b.full_name || '')).map(student => {
                  const log = sessionLogs.find(l => l.student_id === student.id);
                  return (
                    <div key={student.id} className="group flex items-center justify-between p-4 bg-gray-50/50 hover:bg-white hover:shadow-md hover:shadow-indigo-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-white rounded-xl shadow-sm flex items-center justify-center text-sm font-black text-indigo-600 border border-gray-100 group-hover:border-indigo-100 transition-colors">
                          {student.full_name?.charAt(0) || student.full_name_ar?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{student.full_name_ar || student.full_name}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5" dir="ltr">
                        {(['present', 'late', 'absent', 'excused'] as const).map(status => (
                          <button
                            key={status}
                            onClick={() => markStudentAttendance(selectedSession.id, student.id, status)}
                            className={cn(
                              "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all shadow-sm active:scale-90",
                              log?.status === status
                                ? status === 'present' ? 'bg-green-500 text-white shadow-green-100' : 
                                  status === 'late' ? 'bg-amber-500 text-white shadow-amber-100' : 
                                  status === 'absent' ? 'bg-red-500 text-white shadow-red-100' :
                                  'bg-blue-500 text-white shadow-blue-100'
                                : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-100'
                            )}
                          >
                            {status === 'present' ? 'حاضر' : status === 'late' ? 'متأخر' : status === 'absent' ? 'غائب' : 'مجاز'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between font-black text-xs text-gray-400">
               <div className="flex gap-4">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full" /> حاضر: {sessionLogs.filter(l => l.status === 'present').length}</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-amber-500 rounded-full" /> متأخر: {sessionLogs.filter(l => l.status === 'late').length}</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-full" /> غائب: {sessionLogs.filter(l => l.status === 'absent').length + (deptStudents.length - sessionLogs.length)}</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-blue-500 rounded-full" /> مجاز: {sessionLogs.filter(l => l.status === 'excused').length}</span>
               </div>
               <p>الإجمالي: {deptStudents.length} طالب</p>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal - Modernized */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-2xl z-[60] flex items-center justify-center p-4" onClick={() => setShowQrModal(null)}>
          <div className="bg-white rounded-[3rem] max-w-md w-full p-10 shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowQrModal(null)}
              className="absolute top-8 left-8 p-3 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-2xl transition-all"
            >
              <XCircle className="w-6 h-6" />
            </button>
            
            <div className="mb-8">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-4 py-1.5 rounded-full mb-3 inline-block">تسجيل الحضور الذكي</span>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">كود الـ QR للمحاضرة</h3>
              <p className="text-gray-500 font-bold mt-2">اطلب من الطلاب مسح الكود من شاشة جهازك</p>
            </div>

            <div className="relative group p-1.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[3.5rem] shadow-2xl shadow-indigo-200 mb-8">
               <div className="bg-white p-8 rounded-[3rem] flex items-center justify-center overflow-hidden relative">
                  {showQrModal.qr_token ? (
                    <div className="relative">
                       <QRCodeSVG 
                        value={`${window.location.origin}/attendance?token=${showQrModal.qr_token}`} 
                        size={220}
                        level="H"
                        includeMargin={false}
                        className="relative z-10"
                      />
                    </div>
                  ) : (
                    <div className="w-[220px] h-[220px] flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    </div>
                  )}
               </div>
            </div>

            <div className="space-y-6">
              <div className={cn(
                "flex items-center justify-center gap-4 py-4 px-8 rounded-3xl border transition-all",
                timeLeft < 30 ? "bg-red-50 border-red-100 animate-pulse" : "bg-slate-50 border-slate-100"
              )}>
                 <Clock className={cn("w-6 h-6", timeLeft < 30 ? "text-red-600" : "text-indigo-500")} />
                 <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الوقت المتبقي</p>
                    <p className={cn("text-2xl font-black tabular-nums leading-none mt-1", timeLeft < 30 ? "text-red-600" : "text-gray-900")}>
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </p>
                 </div>
              </div>

              {timeLeft === 0 && (
                <button
                  onClick={() => refreshQrMutation.mutate(showQrModal.id)}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <RefreshCcw className="w-5 h-5" /> تحديث الكود
                </button>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 text-right">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">حاضرون حالياً</p>
                    <p className="text-3xl font-black text-emerald-900 mt-1">{sessionLogs.length}</p>
                 </div>
                 <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100 text-right">
                    <p className="text-[10px] font-black text-indigo-700 uppercase tracking-tighter">حالة الكود</p>
                    <p className="text-sm font-black text-indigo-900 mt-2 flex items-center gap-2">
                       <span className={cn("w-2 h-2 rounded-full", timeLeft > 0 ? "bg-green-500" : "bg-red-500")} />
                       {timeLeft > 0 ? 'نشط ومتاح' : 'منتهي الوقت'}
                    </p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentAttendance() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [scanValue, setScanValue] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState('');

  // Mutations
  const qrAttendanceMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await api.post('/attendance/submit-qr', {
        token,
        student_id: currentUser?.id
      });
      return res.data;
    },
    onSuccess: (data) => {
      // Invalidate all attendance related queries
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      
      setShowScanner(false);
      setScanValue('');
      setError('');
      
      // Show success message and force a small delay before clearing URL to ensure queries refresh
      alert(data.message || 'تم تسجيل الحضور بنجاح');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'فشل تسجيل الحضور. تأكد من الكود.');
    }
  });

  // Handle URL token for attendance
  useEffect(() => {
    const token = searchParams.get('token');
    if (token && currentUser?.id && !qrAttendanceMutation.isPending && !qrAttendanceMutation.isSuccess) {
      console.log('Auto-submitting attendance for token:', token);
      qrAttendanceMutation.mutate(token);
      
      // Clean URL after consuming token
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('token');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, currentUser?.id, qrAttendanceMutation.isPending, qrAttendanceMutation.isSuccess]);

  // Queries
  const { data: activeSessions = [], isLoading: loadingActive } = useQuery<AttendanceSession[]>({
    queryKey: ['attendance', 'sessions', 'active', 'department', currentUser?.department_id],
    queryFn: async () => (await api.get('/attendance/sessions/active', { params: { department_id: currentUser?.department_id } })).data,
    enabled: !!currentUser?.department_id
  });

  const { data: courseStats = [], isLoading: loadingStats } = useQuery<any[]>({
    queryKey: ['attendance', 'student', 'stats', currentUser?.id],
    queryFn: async () => (await api.get(`/attendance/student/${currentUser?.id}/stats`)).data,
    enabled: !!currentUser?.id
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery<any[]>({
    queryKey: ['attendance', 'student', 'logs', currentUser?.id],
    queryFn: async () => (await api.get(`/attendance/student/${currentUser?.id}/logs`)).data,
    enabled: !!currentUser?.id
  });

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanValue.trim()) return;
    
    // Extract token if user pasted the full URL
    let tokenToSubmit = scanValue.trim();
    try {
      if (tokenToSubmit.includes('?token=')) {
        const url = new URL(tokenToSubmit);
        const urlToken = url.searchParams.get('token');
        if (urlToken) tokenToSubmit = urlToken;
      } else if (tokenToSubmit.includes('/attendance?')) {
        // Handle partial URLs or different formats
        const match = tokenToSubmit.match(/token=([^&]+)/);
        if (match) tokenToSubmit = match[1];
      }
    } catch (e) {
      // If URL parsing fails, just use the raw value
    }
    
    qrAttendanceMutation.mutate(tokenToSubmit);
  };

  const loading = loadingActive || loadingStats || loadingLogs;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // Calculate stats
  const attendedCount = courseStats.reduce((acc, curr) => acc + curr.attended, 0);
  const totalSessionsCount = courseStats.reduce((acc, curr) => acc + curr.total_sessions, 0);
  const avgAttendance = totalSessionsCount > 0 ? (attendedCount / totalSessionsCount) * 100 : 0;

  return (
    <div className="space-y-8 pb-10" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            حضوري وغيابي
          </h1>
          <p className="text-gray-500 mt-2 font-medium">تابع سجل حضورك ومعدل التزامك بالمحاضرات</p>
        </div>
        
        {activeSessions.filter(s => !logs.some(l => l.session_id === s.id)).length > 0 && (
          <button
            onClick={() => setShowScanner(true)}
            className="group relative flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95"
          >
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-ping" />
            <QrCode className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            تسجيل الحضور الآن
          </button>
        )}
      </div>

      {/* Active Sessions Alert - More Immersive */}
      {activeSessions.filter(s => !logs.some(l => l.session_id === s.id)).length > 0 && (
        <div className="relative overflow-hidden bg-white border border-indigo-100 rounded-3xl p-6 shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center p-1.5 bg-green-100 text-green-600 rounded-lg">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">محاضرات بانتظار حضورك</h3>
              </div>
              <p className="text-gray-500 text-sm">لديك جلسات حضور مفتوحة حالياً، لا تنسى تسجيل حضورك قبل انتهاء الوقت.</p>
            </div>
          </div>
          
          <div className="mt-6 grid gap-3">
            {activeSessions
              .filter(s => !logs.some(l => l.session_id === s.id))
              .map(s => (
                <div key={s.id} className="flex items-center justify-between bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 hover:bg-indigo-100/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 font-bold">
                      {(s as any).lectures?.courses?.name?.charAt(0) || 'L'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{(s as any).lectures?.courses?.name_ar || (s as any).lectures?.courses?.name}</p>
                      <p className="text-xs text-indigo-600 font-medium flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                         بدأت في {new Date(s.opened_at || '').toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowScanner(true)}
                    className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm border border-indigo-100 hover:text-indigo-700 transition-all font-bold text-xs"
                  >
                    مسح الكود
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Stats Cards - Gradient Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" dir="rtl">
        <div className="relative group overflow-hidden bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm transition-all hover:shadow-md">
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-50 rounded-full translate-x-1/2 translate-y-1/2 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-gray-500 font-bold text-sm tracking-wide">نسبة الالتزام</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className={cn("text-4xl font-black", avgAttendance >= 75 ? 'text-emerald-600' : 'text-red-600')}>
                {avgAttendance.toFixed(1)}%
              </p>
              <span className="text-xs text-gray-400 font-bold">بناءً على {totalSessionsCount} جلسة</span>
            </div>
          </div>
        </div>

        <div className="relative group overflow-hidden bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm transition-all hover:shadow-md">
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-indigo-50 rounded-full translate-x-1/2 translate-y-1/2 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-gray-500 font-bold text-sm tracking-wide">إجمالي الحضور</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-4xl font-black text-gray-900">{attendedCount}</p>
              <span className="text-xs text-gray-400 font-bold">محاضرة مؤكدة</span>
            </div>
          </div>
        </div>
      </div>

      {/* History - Cards instead of List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-black text-gray-900">أحدث النشاطات</h2>
          <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">المزيد</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {logs.slice(0, 10).map(log => {
             const session = log.attendance_sessions;
             const courses = session?.lectures?.courses;
             const status = log.status?.toUpperCase() || 'PRESENT';
             
             return (
              <div key={log.id} className="group bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-indigo-100/50 hover:border-indigo-100 transition-all">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                    status === 'PRESENT' ? 'bg-green-50 text-green-600' : 
                    status === 'LATE' ? 'bg-amber-50 text-amber-600' : 
                    status === 'ABSENT' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  )}>
                    {status === 'PRESENT' ? <CheckCircle2 className="w-6 h-6" /> : 
                     status === 'ABSENT' ? <XCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {courses?.name_ar || courses?.name || 'مادة غير معروفة'}
                    </p>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      {session?.opened_at ? new Date(session.opened_at).toLocaleDateString('ar-IQ', { weekday: 'long', day: 'numeric', month: 'short' }) : 'N/A'}
                    </p>
                  </div>

                  <div className="text-left">
                    <span className={cn(
                      "inline-block text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider",
                      status === 'PRESENT' ? 'bg-green-100 text-green-700' : 
                      status === 'LATE' ? 'bg-amber-100 text-amber-700' :
                      status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    )}>
                      {status === 'PRESENT' ? 'حاضر' : status === 'LATE' ? 'متأخر' : status === 'ABSENT' ? 'غائب' : 'مجاز'}
                    </span>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">
                       {session?.opened_at ? new Date(session.opened_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                </div>
              </div>
             );
          })}
        </div>

        {logs.length === 0 && (
          <div className="bg-gray-50 rounded-[2rem] p-12 text-center border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <ClipboardCheck className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">لا يوجد سجل للحضور حالياً</h3>
            <p className="text-gray-500 text-sm mt-1 font-medium">ابدأ بتسجيل حضورك في المحاضرات لتظهر هنا.</p>
          </div>
        )}
      </div>

      {/* QR Scanner Modal (Simulated) - Modern Dark Version */}
      {showScanner && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-2xl z-[70] flex flex-col items-center justify-center p-6" dir="rtl">
           <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-purple-500/10 pointer-events-none" />
           
           <button 
             onClick={() => setShowScanner(false)}
             className="absolute top-8 left-8 p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all border border-white/10 active:scale-90"
           >
             <XCircle className="w-6 h-6" />
           </button>

           <div className="max-w-md w-full space-y-10 text-center relative">
              <div className="space-y-4">
                 <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/40 border border-indigo-400/50">
                    <Camera className="w-10 h-10 text-white" />
                 </div>
                 <h2 className="text-4xl font-black text-white tracking-tight">مسح الكود</h2>
                 <p className="text-slate-400 font-bold max-w-[280px] mx-auto">وجه الكاميرا نحو كود الـ QR الخاص بالمحاضرة لتأكيد حضورك.</p>
              </div>

              {/* Enhanced Simulated Scanner */}
              <div className="relative aspect-square max-w-[320px] mx-auto group">
                 <div className="absolute inset-0 border-[12px] border-white/5 rounded-[4rem]" />
                 <div className="absolute inset-0 bg-slate-900 rounded-[3.5rem] shadow-inner overflow-hidden">
                    {/* Corner Borders */}
                    <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-indigo-500 rounded-tl-2xl opacity-60" />
                    <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-indigo-500 rounded-tr-2xl opacity-60" />
                    <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-indigo-500 rounded-bl-2xl opacity-60" />
                    <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-indigo-500 rounded-br-2xl opacity-60" />
                    
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-indigo-500/10 animate-pulse" />
                    <div className="absolute top-1/2 left-0 w-full h-[3px] bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,1)] animate-scan-line" />
                    <div className="absolute inset-[10%] border-2 border-dashed border-indigo-500/20 rounded-3xl" />
                 </div>
              </div>

              <form onSubmit={handleScanSubmit} className="space-y-6 pt-4">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center block">
                       أو أدخل الرمز يدوياً
                    </label>
                    <input 
                      type="text" 
                      value={scanValue}
                      onChange={(e) => setScanValue(e.target.value)}
                      placeholder="أدخل الرمز هنا..."
                      className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-4 px-6 text-white text-center font-black text-2xl tracking-widest focus:border-indigo-500 focus:bg-white/10 transition-all outline-none placeholder:text-slate-600 shadow-xl"
                    />
                 </div>

                 {error && (
                   <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 animate-shake">
                      <AlertCircle className="w-4 h-4" /> {error}
                   </div>
                 )}

                 <button
                   type="submit"
                   disabled={qrAttendanceMutation.isPending || !scanValue}
                   className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/30 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
                 >
                   {qrAttendanceMutation.isPending ? <Loader2 className="w-7 h-7 animate-spin" /> : <><CheckCircle2 className="w-7 h-7" /> تأكيد الحضور الآن</>}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
