import { useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardQueries } from '@/lib/queries';
import type { Announcement } from '@/types';
import { Megaphone, Plus, Trash2, Bell, X, AlertTriangle, User, Calendar, CheckSquare } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function AnnouncementsPage() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [error, setError] = useState('');

  const canManage = currentUser?.role === 'hod' || currentUser?.role === 'dean' || currentUser?.role === 'supervisor' || currentUser?.role === 'owner';

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements', currentUser?.department_id],
    queryFn: () => dashboardQueries.getAnnouncements(currentUser?.department_id || ''),
    enabled: !!currentUser,
  });

  const addMutation = useMutation({
    mutationFn: (newAnn: any) => api.post('/announcements/', newAnn),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowAddModal(false);
      setTitle('');
      setContent('');
      setIsGlobal(false);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'فشل في نشر الإعلان');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: () => {
      alert('فشل في حذف الإعلان');
    }
  });

  const handleAdd = () => {
    if (!title || !content) {
      setError('يرجى ملء جميع الحقول');
      return;
    }
    setError('');
    addMutation.mutate({
      title,
      content,
      is_global: isGlobal,
      department_id: isGlobal ? null : currentUser?.department_id
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;
    deleteMutation.mutate(id);
  };

  if (isLoading && announcements.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-orange-500" />
            الإعلانات الأكاديمية
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">تابع آخر التنبيهات والقرارات الصادرة من رئاسة القسم والعمادة</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" /> نشر إعلان جديد
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">لا توجد إعلانات حالياً</h3>
            <p className="text-gray-500 text-sm mt-1">سيتم عرض الإعلانات الجديدة هنا فور نشرها</p>
          </div>
        ) : (
          announcements.map((ann: Announcement) => (
            <div 
              key={ann.id} 
              className={cn(
                "bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group",
                ann.is_global && "border-orange-100 bg-orange-50/10"
              )}
            >
              {ann.is_global && (
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-orange-500 text-white text-[10px] font-black rounded-bl-2xl">
                  إعلان عام للمؤسسة
                </div>
              )}
              
              <div className="flex gap-5">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                  ann.is_global ? "bg-orange-100 text-orange-600" : "bg-indigo-50 text-indigo-600"
                )}>
                  <Bell className="w-6 h-6" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <h4 className="text-lg font-black text-gray-900 leading-tight pr-4">{ann.title}</h4>
                  <p className="text-gray-700 leading-relaxed font-medium whitespace-pre-wrap">{ann.content}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 pt-4 mt-4 border-t border-gray-50 text-xs text-gray-400 font-bold">
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                      <User className="w-3.5 h-3.5" />
                      <span>{ann.publisher_name} ({ann.publisher_role})</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(ann.created_at).toLocaleDateString('ar-EG', { dateStyle: 'long' })}</span>
                    </div>
                  </div>
                </div>

                {canManage && (currentUser?.id === ann.created_by || currentUser?.role === 'dean') && (
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="حذف الإعلان"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="mb-8">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Plus className="w-6 h-6 text-indigo-600" />
                نشر إعلان جديد
              </h3>
              <p className="text-gray-500 text-sm mt-1">سيتم إرسال تنبيه لكافة الفئات المشمولة بالإعلان</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 pr-1">عنوان الإعلان</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                  placeholder="مثال: هام جداً بخصوص الامتحانات..."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 pr-1">محتوى الإعلان</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold resize-none"
                  placeholder="اكتب تفاصيل الإعلان هنا..."
                />
              </div>

              {currentUser?.role === 'dean' && (
                <div className="p-4 bg-orange-50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckSquare className={cn("w-5 h-5", isGlobal ? "text-orange-600" : "text-gray-300")} />
                    <div>
                      <p className="text-sm font-black text-orange-900">إعلان للمؤسسة كاملة</p>
                      <p className="text-[10px] text-orange-700 font-bold">سيظهر لكافة الكليات والأقسام</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsGlobal(!isGlobal)}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all",
                      isGlobal ? "bg-orange-500" : "bg-gray-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      isGlobal ? "left-1" : "left-7"
                    )} />
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border border-red-100">
                  <AlertTriangle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <button
                onClick={handleAdd}
                disabled={addMutation.isPending}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {addMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري النشر...
                  </>
                ) : 'نشر هذا الإعلان الآن'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
