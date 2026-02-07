import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { cn } from '@/utils/cn';

export function ProfilePage() {
  const { currentUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [fullNameAr, setFullNameAr] = useState(currentUser?.full_name_ar || '');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage(null);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('يجب اختيار صورة أولاً');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;

      // Upload the image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update the user's profile with the new avatar_url
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'تم تحديث صورة الحساب بنجاح' });
      // The context will auto-refresh as it listens to auth/profile changes?
      // Actually fetchProfile is called on onAuthStateChange. 
      // We might need to manually trigger a refresh or let the user refresh.
      // In this project's AuthContext, we don't have a refresh method.
      // But typically we'd reload or use a state update.
      window.location.reload(); // Simple way to refresh context data for now
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setMessage({ type: 'error', text: error.message || 'فشل في رفع الصورة' });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdating(true);
      setMessage(null);

      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          full_name_ar: fullNameAr 
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'تم تحديث معلومات الحساب بنجاح' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message || 'فشل في تحديث المعلومات' });
    } finally {
      setUpdating(false);
    }
  };

  const roleLabelsAr = {
    owner: 'المالك',
    dean: 'العميد',
    supervisor: 'المشرف',
    hod: 'رئيس القسم',
    teacher: 'أستاذ',
    student: 'طالب',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex flex-col items-center">
            <div className="-mt-16 relative">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden flex items-center justify-center">
                {currentUser.avatar_url ? (
                  <img 
                    src={currentUser.avatar_url} 
                    alt={currentUser.full_name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <UserIcon className="w-16 h-16" />
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-1 right-1 p-2 bg-white rounded-full shadow-md border border-gray-100 text-gray-600 hover:text-indigo-600 hover:scale-110 transition-all"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload} 
                className="hidden" 
                accept="image/*"
              />
            </div>
            
            <div className="mt-4 text-center">
              <h1 className="text-2xl font-bold text-gray-900">{currentUser.full_name}</h1>
              <p className="text-gray-500">{currentUser.email}</p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-100">
                  {roleLabelsAr[currentUser.role] || currentUser.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Account Info Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              تفاصيل الحساب
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">البريد الإلكتروني</p>
                  <p className="text-sm font-medium text-gray-900 truncate w-full">{currentUser.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <Shield className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">الدور الوظيفي</p>
                  <p className="text-sm font-medium text-gray-900 uppercase">{currentUser.role}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">تاريخ الانضمام</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(currentUser.created_at).toLocaleDateString('ar-IQ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">تعديل معلومات الملف الشخصي</h2>
            
            {message && (
              <div className={cn(
                "mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
                message.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
              )}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                <p className="text-sm font-medium">{message.text}</p>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل (English)</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل (بالعربي)</label>
                  <input
                    type="text"
                    value={fullNameAr}
                    onChange={(e) => setFullNameAr(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-right"
                    placeholder="ادخل اسمك الكامل"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={updating}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                  حفظ التغييرات
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
