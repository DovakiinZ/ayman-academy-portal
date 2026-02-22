import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { User, BookOpen, Clock, Settings, LogIn, CreditCard, Globe } from 'lucide-react';

const Account = () => {
  const { t, toggleLanguage, language } = useLanguage();

  // Mock - not logged in state
  const isLoggedIn = false;

  if (!isLoggedIn) {
    return (
      <Layout>
        <section className="section-academic">
          <div className="container-academic max-w-md">
            <div className="academic-card text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <LogIn className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                {t('تسجيل الدخول', 'Sign In')}
              </h1>
              <p className="text-muted-foreground mb-6">
                {t(
                  'قم بتسجيل الدخول للوصول إلى حسابك ومتابعة دروسك',
                  'Sign in to access your account and continue your lessons'
                )}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 text-start">
                    {t('البريد الإلكتروني', 'Email')}
                  </label>
                  <input
                    type="email"
                    placeholder={t('example@email.com', 'example@email.com')}
                    className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 text-start">
                    {t('كلمة المرور', 'Password')}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <Link to="/login" className="w-full block">
                  <Button className="w-full">
                    {t('تسجيل الدخول', 'Sign In')}
                  </Button>
                </Link>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-4">
                  {t('ليس لديك حساب؟', "Don't have an account?")}
                </p>
                <Link to="/register" className="w-full block">
                  <Button variant="outline" className="w-full">
                    {t('إنشاء حساب جديد', 'Create New Account')}
                  </Button>
                </Link>
              </div>

              {/* Language Toggle */}
              <div className="mt-6 pt-6 border-t border-border">
                <button
                  onClick={toggleLanguage}
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  {language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  // Logged in state (placeholder for future)
  return (
    <Layout>
      <section className="section-academic">
        <div className="container-academic">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="academic-card">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t('مرحباً', 'Welcome')}
                    </h3>
                    <p className="text-sm text-muted-foreground">user@email.com</p>
                  </div>
                </div>
                <nav className="space-y-2">
                  <a href="#" className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-secondary text-foreground">
                    <User className="w-4 h-4" />
                    {t('الملف الشخصي', 'Profile')}
                  </a>
                  <a href="#" className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                    <BookOpen className="w-4 h-4" />
                    {t('دروسي', 'My Lessons')}
                  </a>
                  <a href="#" className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                    <Clock className="w-4 h-4" />
                    {t('سجل المشاهدة', 'Watch History')}
                  </a>
                  <a href="#" className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                    <CreditCard className="w-4 h-4" />
                    {t('الاشتراك', 'Subscription')}
                  </a>
                  <a href="#" className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                    <Settings className="w-4 h-4" />
                    {t('الإعدادات', 'Settings')}
                  </a>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="academic-card">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  {t('الملف الشخصي', 'Profile')}
                </h2>
                <p className="text-muted-foreground">
                  {t('محتوى الصفحة سيظهر هنا بعد تسجيل الدخول', 'Page content will appear here after signing in')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Account;
