import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, User, LogIn, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import logo from '@/assets/logo.png';

const Header = () => {
  const { t, toggleLanguage, language } = useLanguage();
  const { isAuthenticated, role, signOut, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: '/', label: { ar: 'الرئيسية', en: 'Home' } },
    { path: '/stages', label: { ar: 'المراحل الدراسية', en: 'Stages' } },
    { path: '/plans', label: { ar: 'الاشتراكات', en: 'Plans' } },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Get dashboard link based on role
  const getDashboardLink = () => {
    switch (role) {
      case 'super_admin':
        return '/admin';
      case 'teacher':
        return '/teacher';
      case 'student':
        return '/student/dashboard';
      default:
        return '/';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 h-14 md:h-16 bg-background/70 backdrop-blur-xl border-b border-border shadow-sm dark:shadow-[0_10px_30px_-20px_rgba(0,0,0,0.7)] transition-all">
      <div className="container-academic">
        <div className="flex items-center justify-between h-12 md:h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src={logo}
              alt="Ayman Academy"
              className="h-20 transition-transform duration-300 hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-[13px] font-bold uppercase tracking-widest transition-all relative py-1 group ${isActive(link.path)
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
                  }`}
              >
                {t(link.label.ar, link.label.en)}
                <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-transform duration-300 origin-left ${isActive(link.path) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'}`} />
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <button
              onClick={toggleLanguage}
              className="text-[11px] font-black tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              {language === 'ar' ? 'EN' : 'عربي'}
            </button>

            <ThemeToggle />

            {/* Auth Section - Desktop */}
            <div className="hidden md:block">
              {isLoading ? (
                <div className="w-24 h-8 bg-muted rounded animate-pulse" />
              ) : isAuthenticated ? (
                // Logged in: Show dropdown
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 h-9 px-4 rounded-xl border border-transparent hover:border-border hover:bg-secondary transition-all">
                      <User className="w-4 h-4 text-primary" />
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-lg dark:shadow-[0_16px_40px_-26px_rgba(91,155,255,0.2)] border-border">
                    <DropdownMenuItem asChild>
                      <Link to={getDashboardLink()} className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                        <LayoutDashboard className="w-4 h-4 text-primary/70" />
                        <span className="font-bold text-foreground">{t('لوحة التحكم', 'Dashboard')}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 bg-border" />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer text-destructive focus:text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="font-bold">{t('تسجيل الخروج', 'Sign Out')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Not logged in: Show login button
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="gap-2 h-9 px-4 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 font-bold text-xs uppercase tracking-wider transition-all">
                    <LogIn className="w-4 h-4" />
                    {t('تسجيل الدخول', 'Sign In')}
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-primary transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-3 border-t border-border/60">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 text-sm rounded transition-colors ${isActive(link.path)
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                >
                  {t(link.label.ar, link.label.en)}
                </Link>
              ))}

              {/* Mobile Auth Section */}
              <div className="border-t border-border/60 mt-2 pt-2">
                {isLoading ? (
                  <div className="px-3 py-2">
                    <div className="w-24 h-6 bg-muted rounded animate-pulse" />
                  </div>
                ) : isAuthenticated ? (
                  <>
                    <Link
                      to={getDashboardLink()}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground rounded flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {t('لوحتي', 'My Dashboard')}
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full px-3 py-2 text-sm text-destructive hover:bg-secondary rounded flex items-center gap-2 text-start"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('تسجيل الخروج', 'Sign Out')}
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground rounded flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    {t('تسجيل الدخول', 'Sign In')}
                  </Link>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
