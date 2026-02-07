import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { User, Department, AcademicLevel } from '@/types';
import { Users, Search, Loader2, ShieldAlert, Check, X, Building2, Upload, Download, GraduationCap, UserPlus, Key, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { UserRole } from '@/types';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { Skeleton, TableSkeleton } from '@/components/Skeleton';

const roleColors = {
  owner: 'bg-red-100 text-red-700',
  dean: 'bg-purple-100 text-purple-700',
  supervisor: 'bg-indigo-100 text-indigo-700',
  hod: 'bg-blue-100 text-blue-700',
  teacher: 'bg-green-100 text-green-700',
  student: 'bg-amber-100 text-amber-700',
};

const roleLabels = {
  owner: 'Owner (المالك)',
  dean: 'Dean (العميد)',
  supervisor: 'Supervisor (المشرف)',
  hod: 'Head of Dept (رئيس القسم)',
  teacher: 'Teacher (تدريسي)',
  student: 'Student (طالب)',
};

export function UsersPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [academicLevels, setAcademicLevels] = useState<AcademicLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [newDeptId, setNewDeptId] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  // Individual User Creation
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdUserResult, setCreatedUserResult] = useState<any | null>(null);
  const [newUser, setNewUser] = useState({
    id_code: '',
    full_name_ar: '',
    role: 'teacher' as UserRole,
    department_id: '',
    password: ''
  });

  // Bulk Creation State
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [selectedDeptIdForBulk, setSelectedDeptIdForBulk] = useState<string>('');
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes, sectionsRes, levelsRes] = await Promise.all([
        api.get('/profiles'),
        api.get('/departments'),
        api.get('/sections'),
        api.get('/academic-levels')
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
      setSections(sectionsRes.data);
      setAcademicLevels(levelsRes.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const isOwner = currentUser?.role === 'owner';
  const isDean = currentUser?.role === 'dean' || isOwner;
  const isHOD = currentUser?.role === 'hod';

  const handleDeleteUser = async (profileId: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف حساب ${name}؟ لا يمكن التراجع عن هذه العملية.`)) return;
    
    try {
      await api.delete(`/profiles/${profileId}`);
      alert('تم حذف الحساب بنجاح');
      fetchData();
    } catch (err: any) {
      console.error('Delete failed', err);
      alert(err.response?.data?.detail || 'فشل حذف الحساب');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingBulk(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      console.log('Parsed JSON from Excel:', jsonData);

      if (jsonData.length === 0) {
        alert("الملف فارغ!");
        return;
      }

      // دالة ذكية جداً للبحث عن القيم بغض النظر عن الحروف أو الترتيب
      const students = jsonData.map(row => {
        const keys = Object.keys(row);
        
        // البحث عن الاسم: يدعم "الاسم", "الاسم الكامل", "Name"
        const nameKey = keys.find(k => /الاسم|name/i.test(k));
        // البحث عن الشعبة: يدعم "الشعبة", "Section"
        const sectionKey = keys.find(k => /شعبة|section/i.test(k));
        // البحث عن المجموعة: يدعم "المجموعة", "Group"
        const groupKey = keys.find(k => /مجموعة|group/i.test(k));

        return {
          full_name_ar: nameKey ? String(row[nameKey]).trim() : "",
          section_name: sectionKey ? String(row[sectionKey]).trim() : "",
          group_name: groupKey ? String(row[groupKey]).trim() : ""
        };
      }).filter(s => s.full_name_ar);

      console.log('Processed students to send:', students);

      if (students.length === 0) {
        const firstRowKeys = Object.keys(jsonData[0]).join(', ');
        alert(`لم نجد بيانات طلاب. الحقول المكتشفة في الملف هي: ${firstRowKeys}\nيرجى التأكد من تسمية الأعمدة بشكل صحيح (الاسم، الشعبة، المجموعة).`);
        return;
      }

      const response = await api.post('/profiles/bulk-students', { 
        students,
        target_level: selectedLevel
      });
      
      const successful = response.data.filter((r: any) => !r.error);
      const failed = response.data.filter((r: any) => r.error);

      if (successful.length === 0 && failed.length > 0) {
        alert(`فشل إنشاء الحسابات:\n${failed.map((f: any) => `- ${f.full_name_ar}: ${f.error}`).join('\n')}`);
        return;
      }

      setBulkResults(successful);
      setIsBulkModalOpen(false); // Close the modal after success
      if (failed.length > 0) {
        alert(`تم إنشاء ${successful.length} حساب، وفشل ${failed.length} حساب بسبب عدم تطابق الشعبة أو المجموعة.`);
      }
      await fetchData();
      alert(`تم إنشاء ${response.data.length} حساب بنجاح`);
    } catch (err) {
      console.error('Bulk creation failed', err);
      alert('فشل في إنشاء الحسابات. تأكد من صحة الملف وصلاحيات الوصول.');
    } finally {
      setIsProcessingBulk(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadAllCards = async () => {
    for (const student of bulkResults) {
      const ref = cardRefs.current[student.email];
      if (ref) {
        try {
          const dataUrl = await toPng(ref, { 
            quality: 1,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            cacheBust: true,
            filter: (node: any) => {
              if (node.tagName === 'LINK' && node.rel === 'stylesheet' && !node.href.includes(window.location.origin)) {
                return false; 
              }
              return true;
            }
          });
          const link = document.createElement('a');
          link.download = `حساب-${student.full_name_ar}.png`;
          link.href = dataUrl;
          link.click();
          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          console.error(`Failed to generate card for ${student.full_name_ar}`, err);
        }
      }
    }
  };

  const filteredUsers = users
    .filter(u => isDean || u.department_id === currentUser?.department_id)
    .filter(u => isOwner || u.role !== 'owner')
    .filter(u => roleFilter === 'all' || u.role === roleFilter)
    .filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const handleUpdateRole = async () => {
    if (!editingUser) return;
    try {
      setUpdating(true);
      await api.patch(`/profiles/${editingUser.id}`, {
        role: newRole,
        department_id: newRole === 'dean' ? null : (newDeptId || null)
      });
      await fetchData();
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to update role', err);
      alert('Failed to update user role');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.id_code || !newUser.full_name_ar) {
      alert("الرمز والاسم مطلوبان");
      return;
    }
    try {
      setCreating(true);
      const res = await api.post('/profiles/', newUser);
      await fetchData();
      setCreatedUserResult(res.data);
      // Reset form
      setNewUser({
        id_code: '',
        full_name_ar: '',
        role: 'teacher',
        department_id: '',
        password: ''
      });
    } catch (err: any) {
      console.error('Failed to create user', err);
      alert(err.response?.data?.detail || 'فشل في إنشاء المستخدم');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 text-right" dir="rtl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-44 rounded-xl" />
            <Skeleton className="h-10 w-44 rounded-xl" />
          </div>
        </div>
        
        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-44 rounded-xl" />
        </div>

        {/* Role Summary Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center">
              <Skeleton className="h-6 w-20 rounded-full mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>

        {/* Users Table Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <TableSkeleton rows={10} cols={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              Users & Roles
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage system users and their role assignments</p>
          </div>
          
          {(isDean || isHOD) && (
            <div className="flex gap-2">
              {isDean && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  إنشاء مستخدم جديد
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx,.xls" 
                className="hidden" 
              />
              <button
                onClick={() => {
                  if (isHOD) setSelectedDeptIdForBulk(currentUser?.department_id || '');
                  setIsBulkModalOpen(true);
                  setBulkResults([]); // Clear previous results when starting new upload
                }}
                disabled={isProcessingBulk}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isProcessingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                إنشاء حسابات طلاب (Excel)
              </button>
              
              {bulkResults.length > 0 && (
                <button
                  onClick={downloadAllCards}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
                >
                  <Download className="w-4 h-4" />
                  تنزيل كروت الطلاب ({bulkResults.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Roles</option>
          <option value="dean">Dean</option>
          <option value="hod">Head of Dept</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['dean', 'hod', 'teacher', 'student'] as const).map(role => {
          const count = filteredUsers.filter(u => u.role === role).length;
          return (
            <div key={role} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className={cn("inline-block text-xs px-2 py-1 rounded-full font-medium mb-2", roleColors[role])}>
                {role.toUpperCase()}
              </p>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-right py-3 px-4 font-medium text-gray-500">المستخدم</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">الايميل</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">الدور</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">القسم</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">المرحلة</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">الاجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const dept = departments.find(d => String(d.id) === String(user.department_id));
                const level = academicLevels.find(l => l.level_number === user.level);
                return (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{user.full_name_ar || user.full_name}</p>
                          <p className="text-xs text-gray-400">{user.full_name}</p>
                        </div>
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
                          {(user.full_name_ar || user.full_name)?.charAt(0) || 'U'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-right">{user.email}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap", roleColors[user.role])}>
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-right">{dept?.name_ar || dept?.name || '—'}</td>
                    <td className="py-3 px-4 text-gray-600 text-right">{user.role === 'student' ? (level?.name_ar || `المرحلة ${user.level || '—'}`) : '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {isDean && user.id !== currentUser?.id && (
                          <>
                            <button 
                              onClick={() => {
                                setEditingUser(user);
                                setNewRole(user.role);
                                setNewDeptId(user.department_id || '');
                              }}
                              className="text-indigo-600 hover:text-indigo-900 font-medium whitespace-nowrap"
                            >
                              تغيير الدور
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id, user.full_name_ar || user.full_name || '')}
                              className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                              title="حذف الحساب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => {
          if (!creating) {
            setIsCreateModalOpen(false);
            setCreatedUserResult(null);
          }
        }}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">إنشاء حساب مستخدم جديد</h3>
              <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setCreatedUserResult(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdUserResult ? (
              <div className="space-y-6 py-4 text-center" dir="rtl">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">تم إنشاء الحساب بنجاح!</h4>
                  <p className="text-sm text-gray-500">يرجى تسليم هذه المعلومات للمستخدم:</p>
                </div>
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-right shadow-inner">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500 font-bold">الاسم:</span>
                    <span className="font-bold text-slate-900">{createdUserResult.user.full_name_ar}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500 font-bold">البريد الإلكتروني:</span>
                    <span className="font-mono text-sm text-indigo-600 font-bold">{createdUserResult.user.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-bold">كلمة المرور المؤقتة:</span>
                    <div className="flex items-center gap-2">
                      <Key className="w-3 h-3 text-amber-500" />
                      <span className="font-mono text-sm text-amber-600 font-black tracking-wider">{createdUserResult.temp_password}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 leading-relaxed text-right flex gap-3">
                  <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                  <p>سيُطلب من المستخدم تغيير كلمة المرور هذه عند تسجيل الدخول لأول مرة لضمان أمن الحساب.</p>
                </div>

                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setCreatedUserResult(null);
                  }}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  إغلاق
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4 text-right" dir="rtl">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">الرمز التعليمي (Code / ID)</label>
                    <input
                      type="text"
                      required
                      value={newUser.id_code}
                      onChange={e => setNewUser({ ...newUser, id_code: e.target.value })}
                      placeholder="مثلاً: 2024001"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">سيتم استخدامه كجزء من البريد الجامعي.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">الاسم الكامل</label>
                    <input
                      type="text"
                      required
                      value={newUser.full_name_ar}
                      onChange={e => setNewUser({ ...newUser, full_name_ar: e.target.value })}
                      placeholder="اسم المستخدم الكامل..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">كلمة المرور (اختياري)</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="اتركه فارغاً لتوليد كلمة مرور تلقائية..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">إذا تُرِك فارغاً، سيقوم النظام بإنشاء كلمة مرور عشوائية.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">الدور الوظيفي</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['teacher', 'hod', 'supervisor', 'student', 'dean', 'owner'] as UserRole[])
                        .filter(r => isOwner || r !== 'owner')
                        .map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setNewUser({ ...newUser, role: r })}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                            newUser.role === r 
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                              : "border-gray-50 bg-gray-50 text-gray-500 hover:border-gray-200"
                          )}
                        >
                          <ShieldAlert className={cn("w-4 h-4", newUser.role === r ? "text-indigo-600" : "text-gray-400")} />
                          {roleLabels[r].split('(')[1].replace(')', '')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(newUser.role !== 'dean' && newUser.role !== 'owner') && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">القسم العلمي</label>
                      <select
                        required
                        value={newUser.department_id}
                        onChange={e => setNewUser({ ...newUser, department_id: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">اختر القسم...</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name_ar}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={creating}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
                  >إلغاء</button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    إنشاء الحساب
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Role Update Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">تعديل صلاحيات المستخدم</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 text-right" dir="rtl">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">المستخدم: {editingUser.full_name_ar || editingUser.full_name}</p>
                <p className="text-xs text-gray-500">{editingUser.email}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">الدور الجديد</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(roleLabels) as UserRole[])
                    .filter(r => isOwner || r !== 'owner')
                    .map(r => (
                    <button
                      key={r}
                      onClick={() => setNewRole(r)}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all text-sm font-medium flex flex-col items-center gap-1",
                        newRole === r ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm" : "border-gray-100 text-gray-500 hover:border-gray-200"
                      )}
                    >
                      <ShieldAlert className={cn("w-5 h-5", newRole === r ? "text-indigo-600" : "text-gray-400")} />
                      {roleLabels[r].split('(')[1].replace(')', '')}
                    </button>
                  ))}
                </div>
              </div>

              {(newRole === 'hod' || newRole === 'supervisor' || newRole === 'teacher' || newRole === 'student') && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">القسم العلمي</label>
                  <select
                    value={newDeptId}
                    onChange={e => setNewDeptId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">اختر القسم...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name_ar}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingUser(null)}
                  disabled={updating}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium"
                >إلغاء</button>
                <button
                  onClick={handleUpdateRole}
                  disabled={updating}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !isProcessingBulk && setIsBulkModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">رفع حسابات الطلاب</h3>
              <button 
                onClick={() => setIsBulkModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600"
                disabled={isProcessingBulk}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-right" dir="rtl">
              {isDean && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">القسم العلمي</label>
                  <select
                    value={selectedDeptIdForBulk}
                    onChange={e => {
                      setSelectedDeptIdForBulk(e.target.value);
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">اختر القسم...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name_ar}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">المرحلة الدراسية</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {academicLevels.map(lvl => (
                    <button
                      key={lvl.id}
                      onClick={() => setSelectedLevel(lvl.level_number)}
                      className={cn(
                        "py-2 rounded-xl border-2 transition-all font-bold text-sm",
                        selectedLevel === lvl.level_number 
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                          : "border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      {lvl.name_ar}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div className="text-xs text-indigo-700 leading-relaxed">
                  <p className="font-bold mb-1">تعليمات ملف Excel:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>يجب أن يحتوي الملف على عمود باسم (الاسم الكامل).</li>
                    <li>يجب أن يحتوي الملف على عمود باسم (الشعبة).</li>
                    <li>يجب أن يحتوي الملف على عمود باسم (المجموعة).</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  disabled={isProcessingBulk}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
                >إلغاء</button>
                <button
                  onClick={() => {
                    if (!selectedDeptIdForBulk) {
                      alert("يرجى اختيار القسم أولاً");
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={isProcessingBulk}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  اختيار ملف Excel
                </button>
              </div>
            </div>
            
            {isProcessingBulk && (
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-2xl z-10">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-2" />
                <p className="text-sm font-bold text-gray-700 animate-pulse">جاري معالجة الملف وإنشاء الحسابات...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden Card Renderers for Image Generation */}
      <div className="fixed -left-[10000px] top-0 pointer-events-none overflow-hidden">
        {bulkResults.map((student) => (
          <div 
            key={student.email}
            ref={el => cardRefs.current[student.email] = el}
            className="w-[450px] bg-white p-8 border-[6px] border-indigo-600 rounded-[32px] font-sans flex flex-col items-center text-center gap-6"
            dir="rtl"
          >
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <GraduationCap className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-1">{student.full_name_ar}</h2>
                <p className="text-indigo-600 font-bold text-sm">البطاقة التعريفية للطالب</p>
              </div>
            </div>

            <div className="w-full h-[2px] bg-indigo-50"></div>
            
            <div className="w-full space-y-3">
              {[
                { label: 'البريد الجامعي', value: student.email, isMono: true },
                { label: 'كلمة المرور المؤقتة', value: student.temp_password, isMono: true },
                { label: 'المرحلة الدراسية', value: academicLevels.find(l => l.level_number === student.level)?.name_ar || `المرحلة ${student.level}` },
                { label: 'الشعبة', value: student.section },
                { label: 'المجموعة الدراسية', value: student.group }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-2xl">
                  <span className="text-slate-500 text-xs font-bold">{item.label}</span>
                  <span className={cn(
                    "font-bold text-slate-800",
                    item.isMono ? "font-mono text-sm tracking-tight" : "text-sm"
                  )}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-3 mt-2">
              <div className="p-3 bg-white rounded-2xl border-2 border-indigo-50">
                <QRCodeSVG 
                  value={`${window.location.origin}/reset-password?email=${encodeURIComponent(student.email)}`} 
                  size={120}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-bold max-w-[200px] leading-relaxed">
                يرجى مسح الرمز أعلاه لتعيين كلمة المرور الدائمة وتفعيل الحساب بشكل كامل.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
