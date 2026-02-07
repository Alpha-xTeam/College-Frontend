import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Lock, KeyRound, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      setLoading(true);

      // 1. Login with temporary password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: tempPassword,
      });

      if (signInError) throw new Error('بيانات الدخول المؤقتة غير صحيحة');

      // 2. Update password to the new one
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // 3. Mark password as changed in profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_changed: true })
        .eq('id', signInData.user.id);

      if (profileError) console.error('Failed to update profile flag', profileError);

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تعيين كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900">تم تغيير كلمة المرور!</h1>
            <p className="text-slate-500 font-medium">
              تم تفعيل حسابك بنجاح. سيتم توجيهك إلى لوحة التحكم خلال لحظات...
            </p>
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            الانتقال للوحة التحكم
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">تفعيل الحساب</h1>
          <p className="text-indigo-100 text-sm mt-1 font-medium">يرجى تعيين كلمة مرور دائمية لحسابك</p>
        </div>

        <form onSubmit={handleReset} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm font-bold border border-red-100 animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-700">البريد الجامعي</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all"
                placeholder="example@college.edu"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-700">كلمة المرور المؤقتة (من الكارت)</label>
              <input
                type="password"
                value={tempPassword}
                onChange={e => setTempPassword(e.target.value)}
                required
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="h-px bg-slate-100 my-4"></div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-700">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all shadow-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-700">تأكيد كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all shadow-sm"
                  placeholder="••••••••"
                />
                <Lock className="w-4 h-4 absolute left-4 top-3.5 text-slate-300" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تفعيل الحساب وتغيير الرمز'}
          </button>
        </form>
      </div>
    </div>
  );
}
