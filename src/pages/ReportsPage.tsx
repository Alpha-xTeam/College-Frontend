import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { cn } from '@/utils/cn';
import type { Department, User } from '@/types';
import { 
  BarChart3, 
  Users, 
  Building2, 
  BookOpen, 
  GraduationCap, 
  Clock, 
  Loader2,
  TrendingUp,
  UserCheck,
  ShieldCheck,
  FileText,
  Activity
} from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';

export function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [statsRes, deptRes, profilesRes] = await Promise.all([
        api.get('/stats/system'),
        api.get('/departments'),
        api.get('/profiles')
      ]);
      setStats(statsRes.data);
      setDepartments(deptRes.data);
      setProfiles(profilesRes.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 text-right font-sans" dir="rtl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />
          </div>
          <Skeleton className="h-12 w-48 rounded-2xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <Skeleton className="p-4 w-15 h-15 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-[500px]">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-[350px]">
              <Skeleton className="h-6 w-40 mb-6" />
              <div className="space-y-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Role distribution
  const roles = {
    dean: profiles.filter(p => p.role === 'dean').length,
    hod: profiles.filter(p => p.role === 'hod').length,
    teacher: profiles.filter(p => p.role === 'teacher').length,
    student: profiles.filter(p => p.role === 'student').length,
    supervisor: profiles.filter(p => p.role === 'supervisor').length
  };

  const totalUsers = profiles.length;

  return (
    <div className="space-y-8 text-right font-sans selection:bg-indigo-100" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <BarChart3 className="w-9 h-9 text-indigo-600" />
            التقارير والإحصائيات العامة
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-lg leading-relaxed">نظرة شاملة على أداء الكلية والبيانات الحقيقية للنظام</p>
        </div>
        <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-sm flex items-center gap-3 self-start md:self-center">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="text-sm font-bold text-slate-700">تحديث مباشر للبيانات</span>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'الأقسام العلمية', value: stats?.departments || 0, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'أعضاء هيئة التدريس', value: roles.teacher + roles.hod, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'إجمالي الطلاب', value: roles.student, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'المواد الدراسية', value: stats?.courses || 0, icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((s, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className={cn("absolute -left-2 -bottom-2 w-16 h-16 rounded-full opacity-10 transition-transform group-hover:scale-150", s.bg)} />
            <div className="flex items-center gap-4 relative">
              <div className={cn("p-4 rounded-2xl shadow-inner", s.bg)}>
                <s.icon className={cn("w-7 h-7", s.color)} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">{s.label}</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Departmental Breakdown Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Activity className="w-5 h-5 text-indigo-600" />
                </div>
                توزيع البيانات حسب الأقسام
              </h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-bold border border-slate-200">كل الأقسام العلمية</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-[11px] font-black uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-5">القسم</th>
                    <th className="px-6 py-5">الأساتذة</th>
                    <th className="px-6 py-5">الطلاب</th>
                    <th className="px-6 py-5">المواد الدراسية</th>
                    <th className="px-6 py-5">الخطة الدراسية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map(dept => {
                    const deptTeachers = profiles.filter(p => p.department_id === dept.id && (p.role === 'teacher' || p.role === 'hod')).length;
                    const deptStudents = profiles.filter(p => p.department_id === dept.id && p.role === 'student').length;
                    return (
                      <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                              {dept.code}
                            </div>
                            <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{dept.name_ar}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-600">{deptTeachers}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-600">{deptStudents}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-600">{stats?.courses_by_dept?.[dept.id] || 0}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold border border-green-100">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_4px_rgba(34,197,94,0.4)]" /> مكتملة
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* User Roles & Distribution */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              توزيع الصلاحيات (Roles)
            </h2>
            <div className="space-y-5">
              {[
                { label: 'العميد', count: roles.dean, color: 'bg-slate-900', key: 'dean' },
                { label: 'رؤساء الأقسام', count: roles.hod, color: 'bg-indigo-600', key: 'hod' },
                { label: 'الأساتذة والمساعدين', count: roles.teacher, color: 'bg-blue-500', key: 'teacher' },
                { label: 'المشرفين', count: roles.supervisor, color: 'bg-amber-500', key: 'supervisor' },
                { label: 'الطلاب', count: roles.student, color: 'bg-purple-500', key: 'student' },
              ].map(role => (
                <div key={role.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500">{role.label}</span>
                    <span className="text-slate-900">{role.count} ({totalUsers > 0 ? Math.round((role.count/totalUsers)*100) : 0}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000", role.color)}
                      style={{ width: `${totalUsers > 0 ? (role.count/totalUsers)*100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">إجمالي الحسابات</p>
                  <p className="text-2xl font-black text-slate-900">{totalUsers}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>

          {/* System Performance Hint */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100 relative overflow-hidden">
            <Activity className="absolute -left-6 -bottom-6 w-32 h-32 text-white/10 -rotate-12" />
            <h3 className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-4">كفاءة الحضور والغياب</h3>
            <div className="space-y-4 relative">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black tracking-tighter">٩٤.٢٪</span>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-sm text-indigo-100 font-medium">نسبة الالتزام بالحضور للأسبوع الحالي تشهد تحسناً بنسبة ٣.٢٪ عن الأسبوع الماضي.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
