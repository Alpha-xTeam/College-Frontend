import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  GraduationCap, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  BookOpen,
  Loader2,
  AlertCircle,
  LayoutGrid
} from 'lucide-react';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [emailOrCode, setEmailOrCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrCode || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await login(emailOrCode, password);
      if (res.error) {
        setError('بيانات الدخول غير صحيحة، يرجى التأكد والمحاولة مرة أخرى.');
      }
    } catch (err) {
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-row-reverse overflow-hidden font-sans" dir="rtl">
      {/* Left Side: Illustration/Brand Image (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-indigo-50 h-full">
        <div className="absolute inset-0 bg-indigo-600/20 z-10 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent z-20"></div>
        <div 
          className="h-full w-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDS2Hj0TX2Bo2NlTA3bGx0gU11Ky9h7xQ-8FDOUk8pkCd8kI3UHXtwzGeTeEeKjHwHe8RcA2flrpthZnHHa8_X5cnX5pT9IWCaq0KYF017Cc8EqdhB3DNy1wtftJJKBG7S9WpEKV6C4yS1-0Hil-FXNal8G88u72wMt2K7e63gq1USCn_MY85GR9YuZ9L2AQqiATXl4bHNCTPTYdyofCvDu3Ku0KEou64UafDUzzKH2MaugjkVI1H5fNE6-RqEiuWQqh2RRtwiqew")' }}
        ></div>
        
        {/* Overlay Content */}
        <div className="absolute bottom-0 right-0 z-30 p-16 w-full text-white text-right">
          <div className="mb-6 h-12 w-12 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 mr-0">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <blockquote className="text-3xl font-bold leading-relaxed tracking-wide mb-4 max-w-lg">
            "التعليم هو جواز سفرك إلى المستقبل، فغداً ينتمي لأولئك الذين يستعدون له اليوم."
          </blockquote>
          <p className="text-white/80 text-sm font-medium tracking-wider uppercase">نظام إدارة الكلية v4.0</p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-4 sm:px-12 lg:px-24 xl:px-32 py-6 bg-slate-50 relative overflow-hidden">
        <div className="flex flex-col w-full max-w-[440px] mx-auto gap-6">
          {/* Brand / Header */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-900">بوابة التعليم</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">أهلاً بك مجدداً</h1>
            <p className="text-slate-500 text-xs font-bold">يرجى تسجيل الدخول للوصول إلى حسابك.</p>
          </div>

          {/* Form */}
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Email / ID Input */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-700" htmlFor="email">
                الرقم الجامعي أو البريد الإلكتروني
              </label>
              <div className="relative">
                <input 
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 transition-all pr-11 text-right"
                  id="email" 
                  placeholder="مثال: 2023001 أو student@college.edu" 
                  type="text" 
                  value={emailOrCode}
                  onChange={(e) => setEmailOrCode(e.target.value)}
                  disabled={loading}
                />
                <span className="absolute right-3 top-3 text-slate-400">
                  <User className="w-5 h-5" />
                </span>
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-slate-700" htmlFor="password">
                  كلمة المرور
                </label>
              </div>
              <div className="relative group">
                <input 
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 transition-all pr-11 pl-11 text-right"
                  id="password" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <span className="absolute right-3 top-3 text-slate-400">
                  <Lock className="w-5 h-5" />
                </span>
                <button 
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                <span className="text-[13px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">تذكرني</span>
              </label>
              <a className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline" href="#">
                نسيت كلمة المرور؟
              </a>
            </div>

            {/* Login Button */}
            <button 
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl text-sm font-black bg-indigo-600 text-white hover:bg-indigo-700 h-11 w-full mt-1 shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تسجيل الدخول"}
            </button>
          </form>

          <div className="relative my-4">
             <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
             <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-slate-50 px-3 text-slate-400">أو</span></div>
          </div>

          <Link 
            to="/general"
            className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-xl text-sm font-black text-slate-700 hover:bg-white hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm"
          >
            <LayoutGrid className="w-4 h-4" /> تصفح النظام كزائر
          </Link>

          {/* Footer Text */}
          <p className="text-center text-[10px] text-slate-500 font-bold leading-relaxed">
            بضغطك على تسجيل الدخول، أنت توافق على <a className="underline hover:text-indigo-600" href="#">شروط الخدمة</a> و <a className="underline hover:text-indigo-600" href="#">سياسة الخصوصية</a>.
          </p>
        </div>

        {/* Bottom Help Link */}
        <div className="absolute bottom-6 left-0 w-full text-center">
          <a className="text-[11px] text-slate-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1 font-bold" href="#">
            <HelpCircle className="w-3.5 h-3.5" /> 
            تحتاج مساعدة؟ تواصل مع الدعم الفني
          </a>
        </div>
      </div>
    </div>
  );
}

