import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Room, Department } from '@/types';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Trash2, 
  X, 
  Loader2, 
  Search,
  Users,
  Calendar,
  Filter,
  ArrowRightLeft,
  Edit2,
  Printer
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { QRCodeSVG } from 'qrcode.react';
import { Skeleton } from '@/components/Skeleton';

export function RoomsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomBuilding, setRoomBuilding] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomType, setRoomType] = useState<'scientific' | 'theoretical'>('theoretical');
  const [roomCapacity, setRoomCapacity] = useState(30);
  const [roomDeptId, setRoomDeptId] = useState('');
  const [submittingRoom, setSubmittingRoom] = useState(false);

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, deptsRes] = await Promise.all([
        api.get('/rooms'),
        api.get('/departments')
      ]);
      setRooms(roomsRes.data);
      setDepartments(deptsRes.data);
      
      // Default department for HOD/Supervisor
      if (currentUser?.department_id) {
        setRoomDeptId(currentUser.department_id);
      }
    } catch (err) {
      console.error('Failed to fetch rooms data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async () => {
    if (!roomName || !roomBuilding || !roomCode) return;
    try {
      setSubmittingRoom(true);
      
      const targetDeptId = (currentUser?.role === 'hod' || currentUser?.role === 'supervisor') 
        ? currentUser.department_id 
        : (roomDeptId || null);

      await api.post('/rooms/', {
        name: roomName,
        building: roomBuilding,
        capacity: roomCapacity,
        code: roomCode,
        type: roomType,
        department_id: targetDeptId
      });

      // Reset form
      setRoomName('');
      setRoomBuilding('');
      setRoomCode('');
      setRoomType('theoretical');
      setRoomCapacity(30);
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to add room', err);
      alert(err.response?.data?.detail || 'فشل في إضافة القاعة. تأكد من صحة البيانات.');
    } finally {
      setSubmittingRoom(false);
    }
  };

  const handleEditRoom = async () => {
    if (!editingRoom || !roomName || !roomBuilding || !roomCode) return;
    try {
      setSubmittingRoom(true);
      await api.patch(`/rooms/${editingRoom.id}`, {
        name: roomName,
        building: roomBuilding,
        capacity: roomCapacity,
        code: roomCode,
        type: roomType,
        department_id: roomDeptId || null
      });

      setShowEditModal(false);
      setEditingRoom(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to edit room', err);
      alert(err.response?.data?.detail || 'فشل في تحديث بيانات القاعة.');
    } finally {
      setSubmittingRoom(false);
    }
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setRoomName(room.name);
    setRoomBuilding(room.building);
    setRoomCode(room.code);
    setRoomType(room.type);
    setRoomCapacity(room.capacity);
    setRoomDeptId(room.department_id || '');
    setShowEditModal(true);
  };

  const handlePrintQR = (room: Room) => {
    const dept = departments.find(d => d.id === room.department_id);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const publicUrl = `${window.location.origin}/room/${room.code}`;
    const qrSvg = document.getElementById(`qr-${room.id}`)?.innerHTML;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - ${room.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            
            @page {
              size: A4;
              margin: 0;
            }

            body { 
              font-family: 'Cairo', sans-serif; 
              margin: 0; 
              padding: 0;
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh;
              background: #f8fafc;
            }

            .a4-container {
              width: 210mm;
              height: 297mm;
              background: white;
              padding: 15mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              position: relative;
              overflow: hidden;
            }

            .header {
              width: 100%;
              text-align: center;
              border-bottom: 4px solid #4f46e5;
              padding-bottom: 5mm;
            }

            .system-name {
              color: #4f46e5;
              font-size: 20pt;
              font-weight: 900;
              margin: 0;
            }

            .college-name {
              color: #64748b;
              font-size: 12pt;
              font-weight: 700;
              margin-top: 1mm;
            }

            .main-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 100%;
              gap: 5mm;
            }

            .room-info {
              text-align: center;
            }

            .room-name {
              font-size: 40pt;
              font-weight: 900;
              color: #1e293b;
              margin: 0;
              line-height: 1.1;
            }

            .room-code {
              font-size: 16pt;
              color: #64748b;
              font-weight: 700;
              margin-top: 2mm;
              background: #f1f5f9;
              padding: 2mm 6mm;
              border-radius: 3mm;
              display: inline-block;
            }

            .qr-wrapper {
              padding: 8mm;
              border: 4mm solid #4f46e5;
              border-radius: 8mm;
              background: white;
              box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.1);
            }

            .qr-code svg {
              width: 90mm;
              height: 90mm;
              display: block;
            }

            .instruction {
              font-size: 14pt;
              color: #475569;
              font-weight: 700;
              text-align: center;
              margin-top: 5mm;
            }

            .footer {
              width: 100%;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-top: 2px solid #e2e8f0;
              padding-top: 5mm;
              margin-top: 5mm;
            }

            .dept-info {
              text-align: right;
            }

            .label { font-size: 9pt; color: #94a3b8; font-weight: 700; margin-bottom: 1mm; }
            .value { font-size: 13pt; color: #1e293b; font-weight: 900; }

            @media print {
              body { background: white; }
              .a4-container { 
                border: none;
                height: 100vh;
                width: 100vw;
                padding: 15mm;
              }
              header, footer, aside, nav, select, button { display: none !important; }
            }
          </style>
        </head>
        <body dir="rtl">
          <div class="a4-container">
            <div class="header">
              <h1 class="system-name">College CMS</h1>
              <div class="college-name">جامعة بابل - كلية تكنولوجيا المعلومات</div>
            </div>

            <div class="main-content">
              <div class="room-info">
                <h2 class="room-name">${room.name}</h2>
                <div class="room-code">رمز القاعة: ${room.code}</div>
              </div>

              <div class="qr-wrapper">
                <div class="qr-code">
                  ${qrSvg}
                </div>
              </div>
              
              <div class="instruction">امسح الكود لعرض جدول المحاضرات مباشرةً</div>
            </div>

            <div class="footer">
              <div class="dept-info">
                <div class="label">القسم العلمي</div>
                <div class="value">${dept?.name_ar || 'عام لجميع الأقسام'}</div>
              </div>
              <div class="qr-hint">
                <div class="label">الرابط المباشر</div>
                <div class="value" style="font-size: 9pt; font-family: monospace; color: #64748b;">${publicUrl}</div>
              </div>
            </div>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه القاعة؟')) return;
    try {
      await api.delete(`/rooms/${roomId}`);
      setRooms(rooms.filter(r => r.id !== roomId));
    } catch (err) {
      console.error('Failed to delete room', err);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          room.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isOwner = currentUser?.role === 'owner';
    const matchesDept = (currentUser?.role === 'dean' || isOwner)
      ? (deptFilter === 'all' || room.department_id === deptFilter)
      : (room.department_id === currentUser?.department_id);

    const matchesType = typeFilter === 'all' || room.type === typeFilter;

    return matchesSearch && matchesDept && matchesType;
  });

  const canManage = currentUser?.role === 'dean' || currentUser?.role === 'hod' || currentUser?.role === 'supervisor' || currentUser?.role === 'owner';

  if (loading) {
    return (
      <div className="space-y-6 text-right" dir="rtl">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-11 w-44 rounded-xl" />
        </div>

        {/* Filters Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="md:col-span-2 h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>

        {/* Rooms Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <Skeleton className="h-5 w-16 rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <Skeleton className="w-8 h-8 rounded-lg" />
                </div>
              </div>
              <Skeleton className="h-7 w-3/4 mb-1" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="pt-4 border-t border-gray-50 flex gap-2">
                <Skeleton className="h-10 flex-1 rounded-xl" />
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            إدارة القاعات الدراسية
          </h1>
          <p className="text-gray-500 mt-1 mr-13">تنظيم وتوزيع القاعات والمختبرات والمساحات الدراسية</p>
        </div>
        
        {canManage && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 justify-center"
          >
            <Plus className="w-5 h-5" />
            إضافة قاعة جديدة
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="بحث عن قاعة بالاسم او الرمز..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
          />
        </div>

        {(currentUser?.role === 'dean' || currentUser?.role === 'owner') && (
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full pr-9 pl-4 py-3 bg-white border border-gray-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
            >
              <option value="all">كل الأقسام</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name_ar}</option>
              ))}
            </select>
          </div>
        )}

        <div className="relative">
          <ArrowRightLeft className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 rotate-90" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full pr-9 pl-4 py-3 bg-white border border-gray-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          >
            <option value="all">كل الأنواع</option>
            <option value="theoretical">قاعات نظرية</option>
            <option value="scientific">مختبرات / علمية</option>
          </select>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRooms.map(room => (
          <div key={room.id} className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all relative overflow-hidden">
            <div className={cn(
              "absolute top-0 right-0 w-2 h-full",
              room.type === 'scientific' ? "bg-amber-400" : "bg-indigo-400"
            )} />
            
            {/* Hidden QR for printing */}
            <div id={`qr-${room.id}`} className="hidden">
              <QRCodeSVG value={`${window.location.origin}/room/${room.code}`} size={512} />
            </div>

            <div className="flex justify-between items-start mb-4">
              <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                {room.code}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {canManage && (
                  <>
                    <button 
                      onClick={() => handlePrintQR(room)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="طباعة QR"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => openEditModal(room)}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteRoom(room.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-1">{room.name}</h3>
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{room.building}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4 text-gray-400" />
                <span>السعة: <span className="font-bold text-gray-900">{room.capacity}</span> طالب</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>القسم: <span className="font-bold text-indigo-600">
                  {departments.find(d => d.id === room.department_id)?.name_ar || 'عام للكل'}
                </span></span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex gap-2">
              <button 
                onClick={() => navigate(`/schedule?room_id=${room.id}`)}
                className="flex-1 bg-gray-50 text-gray-700 py-2 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                جدول المحاضرات
              </button>
              <button 
                onClick={() => window.open(`${window.location.origin}/room/${room.code}`, '_blank')}
                className="px-3 bg-gray-50 text-gray-400 py-2 rounded-xl hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="الرابط العام"
              >
                <ArrowRightLeft className="w-4 h-4 -rotate-45" />
              </button>
            </div>
          </div>
        ))}
        
        {filteredRooms.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">لا توجد نتائج</h3>
            <p className="text-gray-500">حاول تغيير معايير البحث او الفلاتر</p>
          </div>
        )}
      </div>

      {/* Add Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-xl font-black text-gray-900">إضافة قاعة دراسية جديدة</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">اسم القاعة</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    placeholder="مثلاً: قاعة 101"
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">رمز القاعة</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={e => setRoomCode(e.target.value)}
                    placeholder="مثلاً: R101"
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">نوع القاعة</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRoomType('theoretical')}
                    className={cn(
                      "py-3 rounded-xl border-2 text-sm font-bold transition-all",
                      roomType === 'theoretical' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-50 bg-gray-50 text-gray-400 hover:bg-gray-100"
                    )}
                  >محاضرة نظرية</button>
                  <button
                    onClick={() => setRoomType('scientific')}
                    className={cn(
                      "py-3 rounded-xl border-2 text-sm font-bold transition-all",
                      roomType === 'scientific' ? "border-amber-600 bg-amber-50 text-amber-700" : "border-gray-50 bg-gray-50 text-gray-400 hover:bg-gray-100"
                    )}
                  >مختبر / علمية</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">البناية / الموقع</label>
                <input
                  type="text"
                  value={roomBuilding}
                  onChange={e => setRoomBuilding(e.target.value)}
                  placeholder="مثلاً: بناية الهندسة"
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">سعة القاعة</label>
                  <input
                    type="number"
                    value={roomCapacity}
                    onChange={e => setRoomCapacity(Number(e.target.value))}
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
                {(currentUser?.role === 'dean' || currentUser?.role === 'owner') && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">تتبع لقسم</label>
                    <select
                      value={roomDeptId}
                      onChange={e => setRoomDeptId(e.target.value)}
                      className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    >
                      <option value="">عامة (بدون قسم)</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name_ar}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={submittingRoom}
                  className="flex-1 px-4 py-3.5 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
                >إلغاء</button>
                <button
                  onClick={handleAddRoom}
                  disabled={submittingRoom}
                  className="flex-1 px-4 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  {submittingRoom ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  تأكيد الإضافة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setShowEditModal(false); setEditingRoom(null); }}>
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-xl font-black text-gray-900">تعديل بيانات القاعة</h3>
              <button onClick={() => { setShowEditModal(false); setEditingRoom(null); }} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">اسم القاعة</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    placeholder="مثلاً: قاعة 101"
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">رمز القاعة</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={e => setRoomCode(e.target.value)}
                    placeholder="مثلاً: R101"
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">نوع القاعة</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRoomType('theoretical')}
                    className={cn(
                      "py-3 rounded-xl border-2 text-sm font-bold transition-all",
                      roomType === 'theoretical' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-50 bg-gray-50 text-gray-400 hover:bg-gray-100"
                    )}
                  >محاضرة نظرية</button>
                  <button
                    onClick={() => setRoomType('scientific')}
                    className={cn(
                      "py-3 rounded-xl border-2 text-sm font-bold transition-all",
                      roomType === 'scientific' ? "border-amber-600 bg-amber-50 text-amber-700" : "border-gray-50 bg-gray-50 text-gray-400 hover:bg-gray-100"
                    )}
                  >مختبر / علمية</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">البناية / الموقع</label>
                <input
                  type="text"
                  value={roomBuilding}
                  onChange={e => setRoomBuilding(e.target.value)}
                  placeholder="مثلاً: بناية الهندسة"
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">سعة القاعة</label>
                  <input
                    type="number"
                    value={roomCapacity}
                    onChange={e => setRoomCapacity(Number(e.target.value))}
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
                {(currentUser?.role === 'dean' || currentUser?.role === 'owner') && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">تتبع لقسم</label>
                    <select
                      value={roomDeptId}
                      onChange={e => setRoomDeptId(e.target.value)}
                      className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    >
                      <option value="">عامة (بدون قسم)</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name_ar}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => { setShowEditModal(false); setEditingRoom(null); }}
                  disabled={submittingRoom}
                  className="flex-1 px-4 py-3.5 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
                >إلغاء</button>
                <button
                  onClick={handleEditRoom}
                  disabled={submittingRoom}
                  className="flex-1 px-4 py-3.5 bg-amber-600 text-white rounded-2xl text-sm font-bold hover:bg-amber-700 disabled:opacity-50 transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
                >
                  {submittingRoom ? <Loader2 className="w-5 h-5 animate-spin" /> : <Edit2 className="w-5 h-5" />}
                  حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
