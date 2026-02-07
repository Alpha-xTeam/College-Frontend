import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
  Users, Search, Download, Edit2, Trash2, X, Check, Loader2, 
  UserCircle, GraduationCap, Award
} from 'lucide-react';
import { cn } from '@/utils/cn';
import * as XLSX from 'xlsx';

interface Teacher {
  id: string;
  full_name: string;
  full_name_ar: string;
  email: string;
  department_id: string;
  departments?: {
    name: string;
    name_ar: string;
  };
}

interface Course {
  id: string;
  name: string;
  name_ar: string;
  code: string;
  departments?: {
    name_ar: string;
  };
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  
  // Selection/Detail State
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [coursesInfo, setCoursesInfo] = useState<{primary: Course[], assistant: Course[]} | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Edit State
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editNameAr, setEditNameAr] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, dRes] = await Promise.all([
        api.get('/profiles/teachers'),
        api.get('/departments')
      ]);
      setTeachers(tRes.data);
      setDepartments(dRes.data);
    } catch (err) {
      console.error('Failed to fetch teachers', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherDetails = async (teacher: Teacher) => {
    try {
      setSelectedTeacher(teacher);
      setLoadingDetails(true);
      const res = await api.get(`/profiles/teachers/${teacher.id}/courses`);
      setCoursesInfo(res.data);
    } catch (err) {
      console.error('Failed to fetch teacher details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateTeacher = async () => {
    if (!editingTeacher) return;
    try {
      setUpdating(true);
      await api.patch(`/profiles/${editingTeacher.id}`, {
        full_name_ar: editNameAr,
        department_id: editDeptId || null
      });
      await fetchData();
      setEditingTeacher(null);
    } catch (err) {
      alert('فشل في تحديث بيانات التدريسي');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف التدريسي "${name}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    try {
      await api.delete(`/profiles/${id}`);
      setTeachers(prev => prev.filter(t => t.id !== id));
      if (selectedTeacher?.id === id) setSelectedTeacher(null);
    } catch (err) {
      alert('فشل في حذف التدريسي');
    }
  };

  const exportToExcel = () => {
    const data = filteredTeachers.map(t => ({
      'الاسم الكامل': t.full_name_ar || t.full_name,
      'القسم': t.departments?.name_ar || 'غير محدد',
      'الايميل': t.email,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teachers List");
    XLSX.writeFile(wb, "Teachers_Report.xlsx");
  };

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = (t.full_name_ar || t.full_name)?.toLowerCase().includes(search.toLowerCase()) || 
                          t.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'all' || t.department_id === deptFilter;
    return matchesSearch && matchesDept;
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      <p className="text-gray-500 font-medium">جاري تحميل قائمة الأساتذة...</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            إدارة الأساتذة
          </h1>
          <p className="text-gray-500 mt-1">عرض وإدارة جميع أعضاء هيئة التدريس في الكلية</p>
        </div>
        <button 
          onClick={exportToExcel}
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-sm"
        >
          <Download className="w-4 h-4" />
          تصدير ملف إكسل
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن اسم الأستاذ أو البريد الإلكتروني..."
            className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
        >
          <option value="all">كل الأقسام</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name_ar}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teachers List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-4 px-6 font-bold text-gray-700">الأستاذ</th>
                    <th className="py-4 px-6 font-bold text-gray-700">القسم</th>
                    <th className="py-4 px-6 text-left">الاجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTeachers.map(teacher => (
                    <tr 
                      key={teacher.id} 
                      className={cn(
                        "hover:bg-indigo-50 transition-all cursor-pointer group",
                        selectedTeacher?.id === teacher.id ? "bg-indigo-50" : ""
                      )}
                      onClick={() => fetchTeacherDetails(teacher)}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border-2 border-white shadow-sm">
                            {teacher.full_name_ar?.charAt(0) || teacher.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                              {teacher.full_name_ar || teacher.full_name}
                            </p>
                            <p className="text-xs text-gray-400 font-medium">{teacher.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">
                          {teacher.departments?.name_ar || 'غير معين'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTeacher(teacher);
                              setEditNameAr(teacher.full_name_ar || '');
                              setEditDeptId(teacher.department_id || '');
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTeacher(teacher.id, teacher.full_name_ar || teacher.full_name);
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredTeachers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <Users className="w-12 h-12 opacity-20" />
                          <p>لا يوجد أساتذة يطابقون البحث</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Details Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-24">
            {!selectedTeacher ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                   <UserCircle className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-400 font-medium">اختر تدريسي لعرض تفاصيل مواد التدريس</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="text-center pb-6 border-b">
                   <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mx-auto flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg mb-3">
                      {(selectedTeacher.full_name_ar || selectedTeacher.full_name).charAt(0)}
                   </div>
                   <h2 className="text-xl font-bold text-gray-900">{selectedTeacher.full_name_ar || selectedTeacher.full_name}</h2>
                   <p className="text-sm text-gray-500 font-medium mt-1">{selectedTeacher.email}</p>
                   <div className="mt-4 flex items-center justify-center gap-2">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                        {selectedTeacher.departments?.name_ar || 'بدون قسم'}
                      </span>
                   </div>
                </div>

                {loadingDetails ? (
                  <div className="flex flex-col items-center py-10 gap-2">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    <p className="text-xs text-gray-400">جاري تحميل المواد...</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                        <Award className="w-4 h-4 text-emerald-500" />
                        المواد كأستاذ أساسي ({coursesInfo?.primary.length || 0})
                      </h3>
                      <div className="space-y-2">
                        {coursesInfo?.primary.map(course => (
                          <div key={course.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                             <div className="flex items-center justify-between">
                               <p className="text-sm font-bold text-gray-700">{course.name_ar}</p>
                               <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-400 font-bold">{course.code}</span>
                             </div>
                          </div>
                        ))}
                        {coursesInfo?.primary.length === 0 && <p className="text-xs text-gray-400 text-center py-2">لا توجد مواد أساسية</p>}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                        <GraduationCap className="w-4 h-4 text-indigo-500" />
                        المواد كمساعد أساسي ({coursesInfo?.assistant.length || 0})
                      </h3>
                      <div className="space-y-2">
                        {coursesInfo?.assistant.map(course => (
                          <div key={course.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                             <div className="flex items-center justify-between">
                               <p className="text-sm font-bold text-gray-700">{course.name_ar}</p>
                               <p className="text-[10px] text-gray-400">{course.departments?.name_ar}</p>
                             </div>
                          </div>
                        ))}
                        {coursesInfo?.assistant.length === 0 && <p className="text-xs text-gray-400 text-center py-2">لا توجد مساهمات كمساعد</p>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTeacher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingTeacher(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                تعديل بيانات التدريسي
              </h3>
              <button 
                onClick={() => setEditingTeacher(null)} 
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 mr-1">الاسم باللغة العربية</label>
                <input
                  type="text"
                  value={editNameAr}
                  onChange={e => setEditNameAr(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all text-sm outline-none"
                  placeholder="ادخل الاسم الكامل..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 mr-1">القسم الأكاديمي</label>
                <select
                  value={editDeptId}
                  onChange={e => setEditDeptId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all text-sm outline-none"
                >
                  <option value="">غير محدد</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name_ar}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                 <button
                   onClick={() => setEditingTeacher(null)}
                   disabled={updating}
                   className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                 >إلغاء</button>
                 <button
                   onClick={handleUpdateTeacher}
                   disabled={updating}
                   className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                   {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                   حفظ التغييرات
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
