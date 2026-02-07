import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { dashboardQueries } from '@/lib/queries';
import {
  LayoutDashboard, Calendar, BookOpen, Users, ClipboardCheck,
  GraduationCap, ChevronLeft, ChevronRight, LogOut, Menu, X, 
  Building2, Settings, ChevronDown, Map, User as UserIcon, Megaphone
} from 'lucide-react';
import { cn } from '@/utils/cn';

const roleLabels = {
  owner: { en: 'Owner', ar: 'المالك', color: 'bg-rose-50 text-rose-600 border border-rose-100 shadow-sm' },
  dean: { en: 'Dean', ar: 'العميد', color: 'bg-violet-50 text-violet-600 border border-violet-100 shadow-sm' },
  hod: { en: 'Head of Dept', ar: 'رئيس القسم', color: 'bg-sky-50 text-sky-600 border border-sky-100 shadow-sm' },
  supervisor: { en: 'Supervisor', ar: 'المشرف', color: 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm' },
  teacher: { en: 'Teacher', ar: 'أستاذ', color: 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm' },
  student: { en: 'Student', ar: 'طالب', color: 'bg-amber-50 text-amber-600 border border-amber-100 shadow-sm' },
};

const navItems = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, roles: ['owner', 'dean', 'supervisor', 'hod', 'teacher', 'student'] },
  { path: '/announcements', label: 'الإعلانات', icon: Megaphone, roles: ['owner', 'dean', 'supervisor', 'hod', 'teacher', 'student'] },
  { path: '/schedule', label: 'الجدول الدراسي', icon: Calendar, roles: ['owner', 'dean', 'supervisor', 'hod', 'teacher', 'student'] },
  { path: '/rooms', label: 'إدارة القاعات', icon: Map, roles: ['owner', 'dean', 'supervisor', 'hod'] },
  { path: '/classrooms', label: 'الصفوف الالكترونية', icon: BookOpen, roles: ['owner', 'dean', 'supervisor', 'hod', 'teacher', 'student'] },
  { path: '/attendance', label: 'الحضور والغياب', icon: ClipboardCheck, roles: ['owner', 'teacher', 'student'] },
  { path: '/departments', label: 'الأقسام العلميّة', icon: Building2, roles: ['owner', 'dean', 'supervisor', 'hod'] },
  { path: '/teachers', label: 'إدارة الأساتذة', icon: GraduationCap, roles: ['owner', 'dean'] },
  { path: '/users', label: 'المستخدمين والأدوار', icon: Users, roles: ['owner', 'dean', 'supervisor', 'hod'] },
  { path: '/reports', label: 'التقارير والنظام', icon: Settings, roles: ['owner', 'dean', 'supervisor', 'hod'] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  if (!currentUser) return null;

  const prefetchData = (path: string) => {
    try {
      if (path === '/dashboard') {
        if (currentUser.role === 'dean' || currentUser.role === 'owner') {
          queryClient.prefetchQuery({ queryKey: ['dean-stats'], queryFn: dashboardQueries.getDeanStats });
          queryClient.prefetchQuery({ queryKey: ['departments-full'], queryFn: dashboardQueries.getDepartmentsFull });
          queryClient.prefetchQuery({ queryKey: ['recent-activities'], queryFn: dashboardQueries.getRecentActivities });
        } else if (currentUser.role === 'hod' || currentUser.role === 'supervisor') {
          queryClient.prefetchQuery({ queryKey: ['hod-stats', currentUser.department_id], queryFn: () => dashboardQueries.getHodStats(currentUser.department_id!) });
        } else if (currentUser.role === 'teacher') {
          queryClient.prefetchQuery({ queryKey: ['teacher-stats', currentUser.id], queryFn: () => dashboardQueries.getTeacherStats(currentUser.id!) });
        } else if (currentUser.role === 'student') {
          queryClient.prefetchQuery({ queryKey: ['student-stats', currentUser.id], queryFn: () => dashboardQueries.getStudentStats(currentUser.id!) });
        }
      } else if (path === '/announcements') {
        queryClient.prefetchQuery({
          queryKey: ['announcements', currentUser.department_id],
          queryFn: () => dashboardQueries.getAnnouncements(currentUser.department_id || ''),
        });
      } else if (path === '/schedule') {
        queryClient.prefetchQuery({ queryKey: ['all-lectures'], queryFn: dashboardQueries.getLectures });
      } else if (path === '/rooms') {
        queryClient.prefetchQuery({ queryKey: ['rooms'], queryFn: () => api.get('/rooms').then(res => res.data) });
      } else if (path === '/departments') {
        queryClient.prefetchQuery({ queryKey: ['departments-full'], queryFn: dashboardQueries.getDepartmentsFull });
      } else if (path === '/classrooms') {
        const queryKey = currentUser.role === 'teacher' ? ['teacher-classrooms', currentUser.id] : ['student-classrooms', currentUser.id];
        queryClient.prefetchQuery({ 
          queryKey, 
          queryFn: () => currentUser.role === 'teacher' 
            ? dashboardQueries.getTeacherClassrooms(currentUser.id!) 
            : api.get(`/classrooms/student/${currentUser.id}`).then(res => res.data)
        });
      }
    } catch (e) {
      console.error('Prefetch error:', e);
    }
  };

  const filteredNav = navItems.filter(item => item.roles.includes(currentUser.role));
  const roleInfo = roleLabels[currentUser.role];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 right-0 z-50 flex flex-col bg-[#0f172a] text-white transition-all duration-500 ease-in-out",
        collapsed ? "w-20" : "w-72",
        mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          {!collapsed && (
            <div className="flex items-center gap-3 animate-in fade-in duration-500">
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-black text-sm tracking-tight">College CMS</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">نظام إدارة الكلية</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20 active:scale-90 transition-all">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto no-scrollbar">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                onMouseEnter={() => prefetchData(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 relative group",
                  isActive
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
                  isActive ? "text-white" : "text-slate-500 group-hover:text-indigo-400",
                  collapsed && "mx-auto"
                )} />
                {!collapsed && <span className="flex-1 text-right">{item.label}</span>}
                {isActive && !collapsed && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-800/50 p-4">
          <div className="relative">
            <button
              onClick={() => setUserDropdown(!userDropdown)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-[1.25rem] hover:bg-slate-800/50 transition-all duration-300 group",
                collapsed && "justify-center"
              )}
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt={currentUser.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-black">
                    {currentUser.full_name.charAt(0)}
                  </div>
                )}
              </div>
              {!collapsed && (
                <>
                  <div className="text-right flex-1 min-w-0">
                    <p className="text-sm font-black truncate text-slate-100">{currentUser.full_name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{roleInfo.ar}</p>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform duration-300", userDropdown && "rotate-180")} />
                </>
              )}
            </button>
            {userDropdown && (
              <div className="absolute bottom-full left-0 right-0 mb-4 bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700/50 py-2 overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-50">
                <button
                  onClick={() => { navigate('/profile'); setUserDropdown(false); }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 text-sm font-bold text-slate-200 transition-colors"
                >
                  <span>الملف الشخصي</span>
                  <UserIcon className="w-4 h-4 text-indigo-400" />
                </button>
                <div className="h-px bg-slate-700/50 mx-4 my-1" />
                <button
                  onClick={() => { logout(); setUserDropdown(false); navigate('/'); }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-500/10 text-sm font-bold text-red-400 transition-colors"
                >
                  <span>تسجيل الخروج</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        {/* Top bar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-8 sticky top-0 z-40 transition-all">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setMobileOpen(true)} 
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {location.pathname === '/profile' ? 'الملف الشخصي' : (filteredNav.find(n => n.path === location.pathname)?.label || 'Dashboard')}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn("px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest", roleInfo.color)}>
               {roleInfo.ar}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
