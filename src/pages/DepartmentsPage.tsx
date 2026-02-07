import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Department, User, Course, Lecture } from '@/types';
import { Building2, Users, BookOpen, Calendar, GraduationCap, Loader2, Plus, X, UserMinus, Search, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/Skeleton';

export function DepartmentsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptNameAr, setDeptNameAr] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [searchTeacher, setSearchTeacher] = useState('');

  const isOwner = currentUser?.role === 'owner';
  const isDean = currentUser?.role === 'dean' || isOwner;

  // Queries
  const { data: departments = [], isLoading: loadingDepts } = useQuery<Department[]>({
    queryKey: ['departments-full'],
    queryFn: async () => (await api.get('/departments-full')).data
  });

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ['profiles'],
    queryFn: async () => (await api.get('/profiles')).data
  });

  const { data: allCourses = [], isLoading: loadingCourses } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: async () => (await api.get('/courses')).data
  });

  const { data: allLectures = [], isLoading: loadingLectures } = useQuery<Lecture[]>({
    queryKey: ['lectures'],
    queryFn: async () => (await api.get('/lectures')).data
  });

  const loading = loadingDepts || loadingUsers || loadingCourses || loadingLectures;

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingDept) {
        return await api.patch(`/departments/${editingDept.id}`, data);
      }
      return await api.post('/departments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments-full'] });
      setShowCreateDept(false);
      setEditingDept(null);
      setDeptName('');
      setDeptNameAr('');
      setDeptCode('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await api.delete(`/departments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments-full'] })
  });

  const setHODMutation = useMutation({
    mutationFn: async ({ deptId, hodId }: { deptId: string, hodId: string | null }) => {
      await api.patch(`/departments/${deptId}`, { hod_id: hodId });
      if (hodId) {
        await api.patch(`/profiles/${hodId}`, { role: 'hod' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments-full'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    }
  });

  const assignTeacherMutation = useMutation({
    mutationFn: async ({ teacherId, deptId }: { teacherId: string, deptId: string | null }) => {
      return await api.patch(`/profiles/${teacherId}`, { department_id: deptId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments-full'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    }
  });

  const handleCreateDept = async () => {
    if (!deptName || !deptCode) return;
    saveMutation.mutate({
      name: deptName,
      name_ar: deptNameAr || deptName,
      code: deptCode
    });
  };

  const handleDeleteDept = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم إزالة جميع الارتباطات.')) return;
    deleteMutation.mutate(id);
  };

  const handleSetHOD = async (deptId: string, hodId: string | null) => {
    setHODMutation.mutate({ deptId, hodId });
  };

  const handleAssignTeacher = async (teacherId: string, deptId: string | null) => {
    assignTeacherMutation.mutate({ teacherId, deptId });
  };

  const visibleDepts = isDean ? departments : departments.filter(d => d.id === currentUser?.department_id);
  const teachers = allUsers.filter(u => u.role === 'teacher');
  const filteredTeachers = teachers.filter(t => 
    t.full_name.toLowerCase().includes(searchTeacher.toLowerCase()) || 
    t.full_name_ar?.includes(searchTeacher)
  );

  if (loading) {
    return (
      <div className="space-y-6 text-right" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-64">
              <Skeleton className="h-1/3 w-full rounded-none" />
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 justify-end">
            <Building2 className="w-6 h-6 text-indigo-600" />
            {isDean ? 'الأقسام العلمية' : 'قسمي'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">نظرة عامة وإدارة الأقسام والأساتذة</p>
        </div>
        {isDean && (
          <button
            onClick={() => setShowCreateDept(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> إضافة قسم جديد
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleDepts.map(dept => {
          const deptCourses = allCourses.filter(c => c.department_id === dept.id);
          const deptTeachers = allUsers.filter(u => u.department_id === dept.id && u.role === 'teacher');
          const deptStudents = allUsers.filter(u => u.department_id === dept.id && u.role === 'student');
          const deptLectures = allLectures.filter(l => l.department_id === dept.id);
          const hod = (dept as any).profiles;

          return (
            <div 
              key={dept.id} 
              onClick={() => navigate(`/departments/${dept.id}`)}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group/card cursor-pointer"
            >
              <div className="bg-gradient-to-l from-indigo-600 to-purple-600 p-5 text-white relative">
                {isDean && (
                  <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDept(dept);
                        setDeptName(dept.name);
                        setDeptNameAr(dept.name_ar);
                        setDeptCode(dept.code);
                        setShowCreateDept(true);
                      }}
                      className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      title="تعديل الإعدادات"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDept(dept.id);
                      }}
                      className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors text-red-100"
                      title="حذف القسم"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <span className="bg-white/20 text-white text-xs px-2 py-1 rounded font-mono">{dept.code}</span>
                  <h2 className="text-xl font-bold">{dept.name_ar}</h2>
                </div>
                <p className="text-indigo-200 text-sm mt-1">{dept.name}</p>
                {hod && <p className="text-xs text-indigo-100 mt-2">رئيس القسم: {hod.full_name_ar || hod.full_name}</p>}
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                    <BookOpen className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{deptCourses.length}</p>
                    <p className="text-xs text-gray-500">المواد</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                    <Users className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{deptTeachers.length}</p>
                    <p className="text-xs text-gray-500">الأساتذة</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                    <GraduationCap className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{deptStudents.length}</p>
                    <p className="text-xs text-gray-500">الطلاب</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-100">
                    <Calendar className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{deptLectures.length}</p>
                    <p className="text-xs text-gray-500">المحاضرات/أسبوع</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-700 mb-2">أساتذة القسم:</p>
                  <div className="max-h-48 overflow-y-auto space-y-2 pl-1 custom-scrollbar">
                    {deptTeachers.map(t => (
                      <div key={t.id} className="flex items-center justify-between gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-100 group">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
                            {t.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{t.full_name_ar || t.full_name}</p>
                            <p className="text-[10px] text-gray-400">{t.email}</p>
                          </div>
                        </div>
                        {isDean && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignTeacher(t.id, null);
                            }}
                            className="p-1.2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="إزالة من القسم"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {deptTeachers.length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-4">لا يوجد أساتذة مضافين حالياً</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isDean && (
        <div className="mt-12 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">إدارة الأساتذة</h2>
              <p className="text-sm text-gray-500">قائمة بجميع الأساتذة المسجلين في الكلية</p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث عن أستاذ..."
                value={searchTeacher}
                onChange={(e) => setSearchTeacher(e.target.value)}
                className="pr-4 pl-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-full md:w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map(teacher => {
              return (
                <div key={teacher.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                      {teacher.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{teacher.full_name_ar || teacher.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{teacher.email}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between gap-2">
                       <select 
                        value={teacher.department_id || ''}
                        onChange={(e) => handleAssignTeacher(teacher.id, e.target.value || null)}
                        className={cn(
                          "flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 outline-none transition-colors",
                          !teacher.department_id ? "bg-red-50 text-red-600 border-red-100" : "bg-white text-gray-600"
                        )}
                       >
                         <option value="">-- اضف إلى قسم --</option>
                         {departments.map(d => (
                           <option key={d.id} value={d.id}>{d.name_ar}</option>
                         ))}
                       </select>
                       {!teacher.department_id && (
                         <div className="p-1.5 bg-red-100 text-red-600 rounded" title="لم يتم تحديد قسم">
                           <X className="w-3.5 h-3.5" />
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Department Modal */}
      {showCreateDept && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200" dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                {editingDept ? `تعديل قسم ${editingDept.name_ar}` : 'إضافة قسم علمي جديد'}
              </h3>
              <button 
                onClick={() => {
                  setShowCreateDept(false);
                  setEditingDept(null);
                }} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم القسم (AR)</label>
                <input
                  type="text"
                  value={deptNameAr}
                  onChange={(e) => setDeptNameAr(e.target.value)}
                  placeholder="مثلاً: هندسة تقنيات الحاسوب"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم القسم (EN)</label>
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Computer Engineering"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-left"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كود القسم</label>
                <input
                  type="text"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  placeholder="مثلاً: CPE"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {editingDept && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تعيين رئيس القسم</label>
                  <select
                    value={editingDept.hod_id || ''}
                    onChange={(e) => handleSetHOD(editingDept.id, e.target.value || null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- اختر رئيس قسم --</option>
                    {allUsers
                      .filter(u => u.role === 'teacher' && u.department_id === editingDept.id)
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.full_name_ar || u.full_name}</option>
                      ))
                    }
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">* يجب أن يكون رئيس القسم من أساتذة القسم حصراً.</p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateDept}
                  disabled={!deptName || !deptCode}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {editingDept ? 'حفظ التغييرات' : 'حفظ القسم'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateDept(false);
                    setEditingDept(null);
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
