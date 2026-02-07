import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';
import api from '@/lib/api';
import type { Department, User, Course, Room, AcademicSection, AcademicGroup } from '@/types';
import { 
  Building2, 
  Users, 
  BookOpen, 
  ArrowRight, 
  GraduationCap, 
  Mail, 
  Loader2,
  UserCheck,
  MapPin,
  Plus,
  Trash2,
  X,
  Layers,
  LayoutGrid
} from 'lucide-react';

export function DepartmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomBuilding, setRoomBuilding] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomType, setRoomType] = useState<'scientific' | 'theoretical'>('theoretical');
  const [roomCapacity, setRoomCapacity] = useState(30);

  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseNameAr, setCourseNameAr] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseCredits, setCourseCredits] = useState(3);
  const [courseSemester, setCourseSemester] = useState(1);
  const [courseTeacherId, setCourseTeacherId] = useState('');

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionName, setSectionName] = useState('');

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');

  // Queries
  const { data: department, isLoading: loadingDept } = useQuery<Department>({
    queryKey: ['departments', id],
    queryFn: async () => {
      const res = await api.get('/departments-full');
      const found = res.data.find((d: any) => String(d.id) === String(id));
      if (!found) throw new Error('Not found');
      return found;
    },
    enabled: !!id
  });

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery<User[]>({
    queryKey: ['profiles-dept', id],
    queryFn: async () => (await api.get('/profiles')).data
  });

  const { data: courses = [], isLoading: loadingCourses } = useQuery<Course[]>({
    queryKey: ['courses-dept', id],
    queryFn: async () => (await api.get('/courses')).data
  });

  const { data: rooms = [], isLoading: loadingRooms } = useQuery<Room[]>({
    queryKey: ['rooms-dept', id],
    queryFn: async () => (await api.get('/rooms')).data
  });

  const { data: sections = [], isLoading: loadingSections } = useQuery<AcademicSection[]>({
    queryKey: ['sections-dept', id],
    queryFn: async () => (await api.get('/sections')).data
  });

  const { data: groups = [], isLoading: loadingGroups } = useQuery<AcademicGroup[]>({
    queryKey: ['groups-dept', id],
    queryFn: async () => (await api.get('/groups')).data
  });

  const loading = loadingDept || loadingProfiles || loadingCourses || loadingRooms || loadingSections || loadingGroups;

  // Mutations
  const addRoomMutation = useMutation({
    mutationFn: async (data: any) => await api.post('/rooms/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-dept', id] });
      setShowRoomModal(false);
      setRoomName('');
      setRoomBuilding('');
      setRoomCode('');
      setRoomType('theoretical');
      setRoomCapacity(30);
    }
  });

  const addCourseMutation = useMutation({
    mutationFn: async (data: any) => await api.post('/courses/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses-dept', id] });
      setShowCourseModal(false);
      setCourseName('');
      setCourseNameAr('');
      setCourseCode('');
      setCourseTeacherId('');
    }
  });

  const addSectionMutation = useMutation({
    mutationFn: async (data: any) => await api.post('/sections/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections-dept', id] });
      setShowSectionModal(false);
      setSectionName('');
    }
  });

  const addGroupMutation = useMutation({
    mutationFn: async (data: any) => await api.post('/groups/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups-dept', id] });
      setShowGroupModal(false);
      setGroupName('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id: targetId }: { type: string, id: string }) => {
      await api.delete(`/${type}/${targetId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`${variables.type}-dept`, id] });
    }
  });

  const handleAddRoom = async () => {
    if (!roomName || !roomBuilding || !roomCode) return;
    const targetDeptId = (currentUser?.role === 'hod' || currentUser?.role === 'supervisor') ? currentUser.department_id : id;
    if (!targetDeptId) return;
    addRoomMutation.mutate({
      name: roomName,
      building: roomBuilding,
      capacity: roomCapacity,
      code: roomCode,
      type: roomType,
      department_id: targetDeptId
    });
  };

  const handleCreateCourse = async () => {
    if (!courseName || !courseNameAr || !courseCode || !courseTeacherId) return;
    const targetDeptId = (currentUser?.role === 'hod' || currentUser?.role === 'supervisor') ? currentUser.department_id : id;
    addCourseMutation.mutate({
      name: courseName,
      name_ar: courseNameAr,
      code: courseCode,
      credits: courseCredits,
      semester: courseSemester,
      teacher_id: courseTeacherId,
      department_id: targetDeptId
    });
  };

  const handleAddSection = async () => {
    if (!sectionName) return;
    const targetDeptId = (currentUser?.role === 'hod' || currentUser?.role === 'supervisor') ? currentUser.department_id : id;
    addSectionMutation.mutate({ name: sectionName, department_id: targetDeptId });
  };

  const handleAddGroup = async () => {
    if (!groupName) return;
    const targetDeptId = (currentUser?.role === 'hod' || currentUser?.role === 'supervisor') ? currentUser.department_id : id;
    addGroupMutation.mutate({ name: groupName, department_id: targetDeptId });
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الشعبة؟')) return;
    deleteMutation.mutate({ type: 'sections', id: sectionId });
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الكروب؟')) return;
    deleteMutation.mutate({ type: 'groups', id: groupId });
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه القاعة؟')) return;
    deleteMutation.mutate({ type: 'rooms', id: roomId });
  };

  const teachers = profiles.filter((u: any) => String(u.department_id) === String(id) && u.role === 'teacher');
  const students = profiles.filter((u: any) => String(u.department_id) === String(id) && u.role === 'student');
  const deptCourses = courses.filter((c: any) => String(c.department_id) === String(id));
  const deptRooms = rooms.filter((r: any) => String(r.department_id) === String(id));
  const deptSections = sections.filter((s: any) => String(s.department_id) === String(id));
  const deptGroups = groups.filter((g: any) => String(g.department_id) === String(id));

  const submittingRoom = addRoomMutation.isPending;
  const submittingCourse = addCourseMutation.isPending;
  const submittingSection = addSectionMutation.isPending;
  const submittingGroup = addGroupMutation.isPending;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!department) return null;

  const profilesRaw = (department as any).profiles;
  const hod = Array.isArray(profilesRaw) ? profilesRaw[0] : profilesRaw;

  const isOwner = currentUser?.role === 'owner';
  const canManageDept = currentUser?.role === 'dean' || isOwner ||
    ((currentUser?.role === 'hod' || currentUser?.role === 'supervisor') && String(currentUser?.department_id) === String(id));

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/departments')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {department.code}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900">{department.name_ar}</h1>
              <p className="text-gray-500 font-medium">{department.name}</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="text-left md:text-right">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">تاريخ التأسيس</p>
              <p className="text-sm font-bold text-gray-700">2024-2025</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics & HOD */}
        <div className="lg:col-span-1 space-y-6">
          {/* HOD Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-50 pb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-500" />
              رئاسة القسم
            </h3>
            {hod ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-100">
                  {(hod.full_name_ar || hod.full_name || '?').charAt(0)}
                </div>
                <h4 className="text-lg font-bold text-gray-900">{hod.full_name_ar || hod.full_name}</h4>
                <p className="text-indigo-600 text-sm font-medium">رئيس القسم</p>
                
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600 justify-end">
                    <span>{hod.email}</span>
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <p className="text-sm italic">لم يتم تعيين رئيس قسم بعد</p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100 relative overflow-hidden">
            <Building2 className="absolute -left-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
            <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-6">إحصائيات سريعة</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{teachers.length}</span>
                <span className="text-sm text-white/80 flex items-center gap-2 font-medium">الأساتذة <Users className="w-4 h-4" /></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{students.length}</span>
                <span className="text-sm text-white/80 flex items-center gap-2 font-medium">الطلاب <GraduationCap className="w-4 h-4" /></span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-2xl font-bold">{courses.length}</span>
                <span className="text-sm text-white/80 flex items-center gap-2 font-medium">المواد الدراسية <BookOpen className="w-4 h-4" /></span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                <div className="flex flex-col">
                  <span className="text-xl font-bold">{sections.length}</span>
                  <span className="text-[10px] text-white/60">شعبة</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold">{groups.length}</span>
                  <span className="text-[10px] text-white/60">كروب</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content (Teachers & Students) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Management Section (Rooms, Sections, Groups) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-4">
              <Building2 className="w-6 h-6 text-indigo-600" />
              إدارة القسم (القاعات، الشعب، والكروبات)
            </h3>
            
            <div className="space-y-8">
              {/* Rooms */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500" />
                    القاعات الدراسية
                  </h4>
                  {canManageDept && (
                    <button onClick={() => setShowRoomModal(true)} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1">
                      <Plus className="w-3 h-3" /> إضافة قاعة
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {rooms.map(room => (
                    <div key={room.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex flex-col items-center relative group">
                      <span className="text-[9px] font-bold bg-white border border-gray-200 px-1.5 py-0.5 rounded absolute top-2 right-2">{room.code}</span>
                      <Building2 className="w-6 h-6 text-gray-400 mb-2" />
                      <p className="text-sm font-bold text-gray-800">{room.name}</p>
                      <p className="text-[10px] text-gray-400">{room.building}</p>
                      {canManageDept && (
                        <button onClick={() => handleDeleteRoom(room.id)} className="absolute top-2 left-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {rooms.length === 0 && <p className="col-span-3 text-center py-4 text-gray-400 text-xs italic">لا توجد قاعات</p>}
                </div>
              </div>

              {/* Sections & Groups */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                {/* Sections */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                      <Layers className="w-4 h-4 text-blue-500" />
                      الشعب (للنظري)
                    </h4>
                    {canManageDept && (
                      <button onClick={() => setShowSectionModal(true)} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold hover:bg-blue-100 transition-colors">
                        + إضافة شعبة
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {sections.map(section => (
                      <div key={section.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-50 bg-gray-50/50 group">
                        <span className="text-xs font-bold text-gray-600">{section.name}</span>
                        {canManageDept && (
                          <button onClick={() => handleDeleteSection(section.id)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {sections.length === 0 && <p className="text-center py-2 text-gray-400 text-[10px] italic">لا توجد شعب</p>}
                  </div>
                </div>

                {/* Groups */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                      <LayoutGrid className="w-4 h-4 text-purple-500" />
                      الكروبات (للعملي)
                    </h4>
                    {canManageDept && (
                      <button onClick={() => setShowGroupModal(true)} className="text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded-md font-bold hover:bg-purple-100 transition-colors">
                        + إضافة كروب
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {groups.map(group => (
                      <div key={group.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-50 bg-gray-50/50 group">
                        <span className="text-xs font-bold text-gray-600">{group.name}</span>
                        {canManageDept && (
                          <button onClick={() => handleDeleteGroup(group.id)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {groups.length === 0 && <p className="text-center py-2 text-gray-400 text-[10px] italic">لا توجد كروبات</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Courses List */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                المواد الدراسية
              </h3>
              {canManageDept && (
                <button
                  onClick={() => setShowCourseModal(true)}
                  className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> إضافة مادة
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map(course => (
                <div key={course.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{course.code}</span>
                    <h4 className="font-bold text-gray-900">{course.name_ar}</h4>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{course.name}</p>
                </div>
              ))}
              {courses.length === 0 && (
                <p className="col-span-2 text-center py-8 text-gray-400 text-sm italic">لا توجد مواد دراسية مضافة لهذا القسم</p>
              )}
            </div>
          </div>

          {/* Teachers & Students Tabs (Simple Layout for now) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Teachers List */}
             <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-50 pb-2">
                <Users className="w-5 h-5 text-green-600" />
                أعضاء الهيئة التدريسية
              </h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {teachers.map(teacher => (
                  <div key={teacher.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                      {teacher.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate text-sm">{teacher.full_name_ar || teacher.full_name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{teacher.email}</p>
                    </div>
                  </div>
                ))}
                {teachers.length === 0 && (
                  <p className="text-center py-6 text-gray-400 text-xs italic">لا يوجد أساتذة مضافين</p>
                )}
              </div>
             </div>

             {/* Students List */}
             <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-50 pb-2">
                <GraduationCap className="w-5 h-5 text-amber-600" />
                الطلاب المسجلين
              </h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {students.map(student => (
                  <div key={student.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold shrink-0">
                      {student.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate text-sm">{student.full_name_ar || student.full_name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{student.email}</p>
                    </div>
                  </div>
                ))}
                {students.length === 0 && (
                  <p className="text-center py-6 text-gray-400 text-xs italic">لا يوجد طلاب مسجلين حالياً</p>
                )}
              </div>
             </div>
          </div>
        </div>
      </div>

      {/* Room Create Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 text-right" dir="rtl" onClick={() => setShowRoomModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">إضافة قاعة دراسية جديدة</h3>
              <button onClick={() => setShowRoomModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">اسم القاعة</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    placeholder="مثلاً: قاعة 101"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">رمز القاعة (للوصول للجدول)</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={e => setRoomCode(e.target.value)}
                    placeholder="مثلاً: R101"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">هذا الرمز سيستخدم في رابط الجدول العام (مثلاً: /room/R101)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">نوع القاعة</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRoomType('theoretical')}
                    className={cn(
                      "py-2 rounded-lg border-2 text-sm font-medium transition-all",
                      roomType === 'theoretical' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-100 text-gray-500 hover:border-gray-200"
                    )}
                  >محاضرة نظرية</button>
                  <button
                    onClick={() => setRoomType('scientific')}
                    className={cn(
                      "py-2 rounded-lg border-2 text-sm font-medium transition-all",
                      roomType === 'scientific' ? "border-amber-600 bg-amber-50 text-amber-700" : "border-gray-100 text-gray-500 hover:border-gray-200"
                    )}
                  >محاضرة علمية / مختبر</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">البناية / الموقع</label>
                <input
                  type="text"
                  value={roomBuilding}
                  onChange={e => setRoomBuilding(e.target.value)}
                  placeholder="مثلاً: بناية الهندسة"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">سعة القاعة</label>
                <input
                  type="number"
                  value={roomCapacity}
                  onChange={e => setRoomCapacity(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowRoomModal(false)}
                  disabled={submittingRoom}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium"
                >إلغاء</button>
                <button
                  onClick={handleAddRoom}
                  disabled={submittingRoom}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingRoom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  إضافة القاعة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Course Create Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 text-right" dir="rtl" onClick={() => setShowCourseModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">إضافة مادة دراسية جديدة</h3>
              <button onClick={() => setShowCourseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">اسم المادة (عربي)</label>
                  <input
                    type="text"
                    value={courseNameAr}
                    onChange={e => setCourseNameAr(e.target.value)}
                    placeholder="مثلاً: البرمجة الكيانية"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">اسم المادة (EN)</label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={e => setCourseName(e.target.value)}
                    placeholder="OOP"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">رمز المادة</label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={e => setCourseCode(e.target.value)}
                    placeholder="CS101"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">عدد الوحدات</label>
                  <input
                    type="number"
                    value={courseCredits}
                    onChange={e => setCourseCredits(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">المرحلة / الفصل الدراسي</label>
                <select
                  value={courseSemester}
                  onChange={e => setCourseSemester(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>الفصل الأول</option>
                  <option value={2}>الفصل الثاني</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">أستاذ المادة</label>
                <select
                  value={courseTeacherId}
                  onChange={e => setCourseTeacherId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">اختر الأستاذ...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name_ar || t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCourseModal(false)}
                  disabled={submittingCourse}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium"
                >إلغاء</button>
                <button
                  onClick={handleCreateCourse}
                  disabled={submittingCourse}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  إضافة المادة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Create Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 text-right" dir="rtl" onClick={() => setShowSectionModal(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 border-b pb-3 text-center">إضافة شعبة جديدة</h3>
            <input
              type="text"
              value={sectionName}
              onChange={e => setSectionName(e.target.value)}
              placeholder="مثلاً: شعبة A"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowSectionModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm transition-colors hover:bg-gray-50">إلغاء</button>
              <button onClick={handleAddSection} disabled={submittingSection} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">إضافة</button>
            </div>
          </div>
        </div>
      )}

      {/* Group Create Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 text-right" dir="rtl" onClick={() => setShowGroupModal(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 border-b pb-3 text-center">إضافة كروب جديد</h3>
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="مثلاً: جروب 1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowGroupModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm transition-colors hover:bg-gray-50">إلغاء</button>
              <button onClick={handleAddGroup} disabled={submittingGroup} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">إضافة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

