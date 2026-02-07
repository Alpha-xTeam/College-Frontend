import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardQueries } from '@/lib/queries';
import type { Announcement } from '@/types';
import {
  Users, BookOpen, Calendar, Building2, ClipboardCheck,
  TrendingUp, Clock, CheckCircle2, GraduationCap,
  Activity, ShieldCheck, Megaphone, Bell, ChevronLeft
} from 'lucide-react';
import { cn } from '@/utils/cn';

function Loader() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-400 animate-pulse">جاري تحميل بيانات لوحة التحكم...</p>
    </div>
  );
}

function AnnouncementsPreview() {
  const { currentUser } = useAuth();
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements', currentUser?.department_id],
    queryFn: () => dashboardQueries.getAnnouncements(currentUser?.department_id || ''),
    enabled: !!currentUser,
  });

  if (isLoading || announcements.length === 0) return null;

  return (
    <div className="mb-10 space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center shadow-sm shadow-orange-200">
            <Megaphone className="w-5 h-5 text-orange-600" />
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">آخر الإعلانات</h3>
        </div>
        <Link to="/announcements" className="px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-black text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2 group shadow-sm">
          عرض الكل <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {announcements.map((ann: Announcement) => (
          <div key={ann.id} className="relative group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-indigo-600/10 hover:border-indigo-100 transition-all duration-500 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-indigo-50 transition-colors" />
            <div className="relative flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                <Bell className="w-6 h-6 text-orange-600 group-hover:text-indigo-600 transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <Link to="/announcements" className="block font-black text-base text-slate-800 truncate group-hover:text-indigo-600 transition-colors leading-tight">
                  {ann.title}
                </Link>
                <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed font-bold">
                  {ann.content}
                </p>
                <div className="mt-4 flex items-center justify-between">
                   <div className="h-1.5 w-8 rounded-full bg-slate-100 group-hover:bg-indigo-200 transition-colors" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     بواسطة القسم
                   </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub, gradient }: { label: string; value: string | number; icon: any; color: string; sub?: string; gradient: string }) {
  return (
    <div className="relative group overflow-hidden bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
      <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-3xl opacity-20 transition-opacity group-hover:opacity-40", gradient)} />
      
      <div className="relative flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{value}</p>
            {sub && <span className="text-[10px] font-black text-slate-400 uppercase">/ {sub}</span>}
          </div>
        </div>
        <div className={cn("w-14 h-14 rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500", color)}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
      
      <div className="mt-6 flex items-center gap-2">
         <div className="h-1 flex-1 bg-slate-50 rounded-full overflow-hidden">
            <div className={cn("h-full w-2/3 rounded-full opacity-30", gradient)} />
         </div>
      </div>
    </div>
  );
}

function DeanDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dean-stats'],
    queryFn: dashboardQueries.getDeanStats,
  });

  const { data: depts = [], isLoading: deptsLoading } = useQuery({
    queryKey: ['departments-full'],
    queryFn: dashboardQueries.getDepartmentsFull,
  });

  const { data: activities = [], isLoading: actLoading } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: dashboardQueries.getRecentActivities,
  });

  const loading = statsLoading || deptsLoading || actLoading;

  if (loading) return <Loader />;
  if (!stats) return <div className="text-center py-10 text-gray-400">فشل في تحميل لوحة التحكم.</div>;

  return (
    <div className="space-y-10">
      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="الأقسام" value={stats.departments || 0} icon={Building2} color="bg-indigo-600" gradient="bg-indigo-500" sub="فعّالة" />
        <StatCard label="المواد" value={stats.courses || 0} icon={BookOpen} color="bg-rose-600" gradient="bg-rose-500" sub="فصلية" />
        <StatCard label="الأساتذة" value={stats.teachers || 0} icon={Users} color="bg-emerald-600" gradient="bg-emerald-500" sub="أكاديمي" />
        <StatCard label="الطلاب" value={stats.students || 0} icon={GraduationCap} color="bg-amber-600" gradient="bg-amber-500" sub="مسجل" />
      </div>

      {/* Advanced Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center justify-between group hover:border-indigo-100 transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">معدل الحضور العام</p>
            <p className="text-2xl font-black text-slate-800">{stats.attendance_rate || 0}%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 transition-all">
            <TrendingUp className="w-6 h-6 text-indigo-600 group-hover:text-white" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center justify-between group hover:border-emerald-100 transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الجلسات المفتوحة الآن</p>
            <p className="text-2xl font-black text-slate-800">{stats.active_sessions || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-600 transition-all">
            <Activity className="w-6 h-6 text-emerald-600 group-hover:text-white" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center justify-between group hover:border-orange-100 transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">القاعات المتوفرة</p>
            <p className="text-2xl font-black text-slate-800">{stats.rooms || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-600 transition-all">
            <Building2 className="w-6 h-6 text-orange-600 group-hover:text-white" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center justify-between group hover:border-rose-100 transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">نشاطات آخر 24 ساعة</p>
            <p className="text-2xl font-black text-slate-800">{stats.recent_activities_count || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-600 transition-all">
            <ShieldCheck className="w-6 h-6 text-rose-600 group-hover:text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-xl shadow-slate-200/40">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800">توزيع الحضور حسب الأقسام</h3>
            <div className="px-3 py-1 bg-emerald-50 rounded-full text-[10px] font-black text-emerald-600 uppercase">معدلات الحضور</div>
          </div>
          <div className="space-y-6">
            {stats.dept_attendance?.length === 0 ? (
              <p className="text-center py-10 text-slate-400 font-bold">لا توجد بيانات حضور كافية</p>
            ) : (
              stats.dept_attendance?.map((dept: any) => (
                <div key={dept.id} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="font-black text-slate-700">{dept.name} ({dept.code})</span>
                    </div>
                    <span className={cn(
                      "font-black",
                      dept.rate >= 80 ? "text-emerald-600" : dept.rate >= 60 ? "text-amber-600" : "text-rose-600"
                    )}>{dept.rate}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        dept.rate >= 80 ? "bg-emerald-500" : dept.rate >= 60 ? "bg-amber-500" : "bg-rose-500"
                      )} 
                      style={{ width: `${dept.rate}%` }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-xl shadow-slate-200/40">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800">نظرة عامة على الأقسام</h3>
            <div className="px-3 py-1 bg-indigo-50 rounded-full text-[10px] font-black text-indigo-600 uppercase">مفصل</div>
          </div>
          <div className="space-y-4">
            {depts.map((dept: any) => (
              <div key={dept.id} className="group flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 border border-transparent hover:border-slate-100 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                    {dept.code}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 leading-tight">{dept.name_ar || dept.name}</p>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">رئيس القسم: {dept.profiles?.full_name_ar || 'غير معين'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-center">
                     <p className="text-sm font-black text-slate-700">{dept.student_count || 0}</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">طالب</p>
                   </div>
                   <div className="text-center">
                     <p className="text-sm font-black text-slate-700">{dept.teacher_count || 0}</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">تدريسي</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-xl shadow-slate-200/40">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800">النشاطات الأخيرة</h3>
            <Link to="/activities" className="text-xs font-black text-indigo-600 hover:underline">مشاهدة السجل</Link>
          </div>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="text-center py-10">
                <Activity className="w-12 h-12 text-slate-100 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-bold">لا توجد نشاطات مسجلة حالياً</p>
              </div>
            ) : (
              activities.slice(0, 6).map((item: any) => {
                let Icon = item.type === 'auth' ? ShieldCheck : 
                           item.type === 'courses' ? BookOpen :
                           item.type === 'departments' ? Building2 :
                           item.type === 'rooms' ? CheckCircle2 :
                           item.type === 'enrollment' ? Users : Activity;
                
                let color = item.type === 'auth' ? 'text-blue-500' :
                            item.type === 'courses' ? 'text-indigo-500' :
                            item.type === 'departments' ? 'text-purple-500' :
                            item.type === 'enrollment' ? 'text-green-500' : 'text-gray-500';

                const date = new Date(item.created_at);
                const timeStr = date.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={item.id} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
                    <div className={cn("w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-slate-800 line-clamp-1">{item.action}</p>
                        <span className="text-[10px] font-black text-slate-400">{timeStr}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-bold mt-0.5 line-clamp-1">{item.details}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-slate-200 border border-white" />
                        <span className="text-[10px] text-indigo-400 font-black truncate">
                          {item.profiles?.full_name_ar || item.profiles?.full_name || 'النظام'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HodDashboard() {
  const { currentUser } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['hod-stats', currentUser?.department_id],
    queryFn: () => dashboardQueries.getHodStats(currentUser?.department_id!),
    enabled: !!currentUser?.department_id,
  });

  const { data: deptCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['dept-courses', currentUser?.department_id],
    queryFn: () => dashboardQueries.getDeptCourses(currentUser?.department_id!),
    enabled: !!currentUser?.department_id,
  });

  const loading = statsLoading || coursesLoading;

  if (loading) return <Loader />;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="المواد الدراسية" value={stats?.courses || 0} icon={BookOpen} color="bg-blue-600" gradient="bg-blue-500" />
        <StatCard label="المحاضرات" value={stats?.lectures || 0} icon={Calendar} color="bg-indigo-600" gradient="bg-indigo-500" />
        <StatCard label="الأساتذة" value={stats?.teachers || 0} icon={Users} color="bg-emerald-600" gradient="bg-emerald-500" />
        <StatCard label="الطلاب" value={stats?.students || 0} icon={GraduationCap} color="bg-amber-600" gradient="bg-amber-500" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">مواد القسم الدراسية</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right py-3 px-4 font-medium text-gray-500">الرمز</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">اسم المادة</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">الأستاذ</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">الوحدات</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">المرحلة</th>
              </tr>
            </thead>
            <tbody>
              {deptCourses.map((c: any) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-indigo-600 font-medium">{c.code}</td>
                  <td className="py-3 px-4">{c.name_ar || c.name} <span className="text-gray-400 text-xs">({c.name})</span></td>
                  <td className="py-3 px-4 text-gray-600">{c.profiles?.full_name || 'غير معين'}</td>
                  <td className="py-3 px-4 text-gray-600">{c.credits}</td>
                  <td className="py-3 px-4 text-gray-600">{c.semester}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeacherDashboard() {
  const { currentUser } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['teacher-stats', currentUser?.id],
    queryFn: () => dashboardQueries.getTeacherStats(currentUser?.id!),
    enabled: !!currentUser?.id,
  });

  const { data: myLectures = [], isLoading: lecturesLoading } = useQuery({
    queryKey: ['teacher-lectures', currentUser?.id],
    queryFn: () => dashboardQueries.getTeacherLectures(currentUser?.id!),
    enabled: !!currentUser?.id,
  });

  const { data: myClassrooms = [], isLoading: classroomsLoading } = useQuery({
    queryKey: ['teacher-classrooms', currentUser?.id],
    queryFn: () => dashboardQueries.getTeacherClassrooms(currentUser?.id!),
    enabled: !!currentUser?.id,
  });

  const loading = statsLoading || lecturesLoading || classroomsLoading;

  const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const today = new Date().getDay();
  // Map JS getDay() (0-6) to your day_of_week if necessary, but assuming 0-4 for Sun-Thu
  const todayLectures = myLectures.filter((l: any) => l.day_of_week === today);

  if (loading) return <Loader />;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="المواد" value={stats?.courses || 0} icon={BookOpen} color="bg-blue-600" gradient="bg-blue-500" />
        <StatCard label="المحاضرات" value={stats?.lectures || 0} icon={Calendar} color="bg-indigo-600" gradient="bg-indigo-500" />
        <StatCard label="الصفوف" value={stats?.classrooms || 0} icon={GraduationCap} color="bg-emerald-600" gradient="bg-emerald-500" />
        <StatCard label="الجلسات المفتوحة" value={stats?.active_sessions || 0} icon={ClipboardCheck} color="bg-rose-600" gradient="bg-rose-500" sub="تحضير" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            جدول اليوم ({daysAr[today] || 'عطلة نهاية الأسبوع'})
          </h3>
          {todayLectures.length === 0 ? (
            <p className="text-gray-400 text-sm py-4">لا توجد محاضرات اليوم.</p>
          ) : (
            <div className="space-y-3">
              {todayLectures.sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || '')).map((l: any) => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: (l.color || '#4F46E5') + '15' }}>
                  <div className="w-1 h-12 rounded-full" style={{ backgroundColor: l.color || '#4F46E5' }} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{l.courses?.name_ar || l.courses?.name || l.course_name_ar || l.course_name || 'غير معروف'}</p>
                    <p className="text-sm text-gray-500">
                      <Link to={`/schedule?room_id=${l.room_id}`} className="hover:text-indigo-600 hover:underline">
                        {l.rooms?.name || l.room_name || 'غير معروف'}
                      </Link>
                      {' '}• {(l.start_time || '').slice(0, 5)} - {(l.end_time || '').slice(0, 5)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            قاعاتي الافتراضية
          </h3>
          <div className="space-y-3">
            {myClassrooms.map((cl: any) => (
              <div key={cl.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{cl.name}</p>
                  <p className="text-sm text-gray-500">الرمز: <span className="font-mono font-semibold text-indigo-600">{cl.class_code}</span></p>
                </div>
                {/* Enrolled count would need a join or another query, but we use the column if it exists or mock it */}
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-700">{cl.enrolled_count || 0}</p>
                  <p className="text-xs text-gray-400">طالب مسجل</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentDashboard() {
  const { currentUser } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['student-stats', currentUser?.id],
    queryFn: () => dashboardQueries.getStudentStats(currentUser?.id!),
    enabled: !!currentUser?.id,
  });

  const { data: allLectures = [], isLoading: lecturesLoading } = useQuery({
    queryKey: ['all-lectures'],
    queryFn: dashboardQueries.getLectures,
  });

  const { data: analytics = [], isLoading: analyticsLoading } = useQuery({
    queryKey: ['student-attendance-stats', currentUser?.id],
    queryFn: () => dashboardQueries.getStudentAttendanceStats(currentUser?.id!),
    enabled: !!currentUser?.id,
  });

  const loading = statsLoading || lecturesLoading || analyticsLoading;

  // Filter lectures by department for now
  const myLectures = allLectures.filter((l: any) => l.department_id === currentUser?.department_id);

  const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const today = new Date().getDay();
  const todayLectures = myLectures.filter((l: any) => l.day_of_week === today);

  if (loading) return <Loader />;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="اليوم" value={todayLectures.length} icon={Calendar} color="bg-blue-600" gradient="bg-blue-500" sub={daysAr[today] || 'عطلة'} />
        <StatCard label="المواد" value={stats?.courses || 0} icon={BookOpen} color="bg-indigo-600" gradient="bg-indigo-500" />
        <StatCard label="الجلسات" value={stats?.active_sessions || 0} icon={ClipboardCheck} color="bg-rose-600" gradient="bg-rose-500" sub="مفتوح" />
        <StatCard label="معدل الحضور" value={`${stats?.avg_attendance || 0}%`} icon={TrendingUp} color="bg-emerald-600" gradient="bg-emerald-500" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">جدول اليوم</h3>
          {todayLectures.length === 0 ? (
            <p className="text-gray-400 text-sm py-4">لا توجد محاضرات اليوم.</p>
          ) : (
            <div className="space-y-3">
              {todayLectures.sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || '')).map((l: any) => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: (l.color || '#4F46E5') + '15' }}>
                  <div className="w-1 h-12 rounded-full" style={{ backgroundColor: l.color || '#4F46E5' }} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{l.course_name_ar || l.course_name}</p>
                    <p className="text-sm text-gray-500">
                      <Link to={`/schedule?room_id=${l.room_id}`} className="hover:text-indigo-600 hover:underline">
                        {l.room_name}
                      </Link>
                      {' '}• {l.start_time} - {l.end_time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">نظرة عامة على الحضور</h3>
          {analytics.length === 0 ? (
            <p className="text-gray-400 text-sm py-4">لا توجد سجلات حضور حالياً.</p>
          ) : (
            <div className="space-y-4">
              {analytics.map((a: any) => (
                <div key={a.course_code}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{a.course_name}</span>
                    <span className={cn("font-semibold", a.percentage >= 80 ? 'text-emerald-600' : a.percentage >= 60 ? 'text-amber-600' : 'text-red-600')}>
                      {a.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", a.percentage >= 80 ? 'bg-emerald-500' : a.percentage >= 60 ? 'bg-amber-500' : 'bg-red-500')}
                      style={{ width: `${a.percentage}%` }}
                    />
                  </div>
                  <p className="text-left text-xs text-gray-400 mt-1">{a.attended}/{a.total_sessions} جلسة</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  return (
    <div className="animate-in fade-in duration-700">
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">أهلاً بك، {currentUser.full_name} 👋</h1>
          <p className="text-slate-500 font-bold mt-1 text-sm tracking-wide">نحن سعداء برؤيتك مجدداً في نظام إدارة الكلية الاستراتيجي</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-black text-slate-400 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
           <Clock className="w-4 h-4 text-indigo-500" />
           {new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <AnnouncementsPreview />

      {(currentUser.role === 'dean' || currentUser.role === 'owner') && <DeanDashboard />}
      {(currentUser.role === 'hod' || currentUser.role === 'supervisor') && <HodDashboard />}
      {currentUser.role === 'teacher' && <TeacherDashboard />}
      {currentUser.role === 'student' && <StudentDashboard />}
    </div>
  );
}
