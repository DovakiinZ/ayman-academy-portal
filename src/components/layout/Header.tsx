import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, User, LogIn, LayoutDashboard, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDarkMode } from '@/hooks/useDarkMode';
import logo from '@/assets/logo.png';

const Header = () => {
  const { t, toggleLanguage, language } = useLanguage();
  const { isAuthenticated, role, signOut, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
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
    // signOut() handles navigation to /login internally
  };

  return (
    <header className="sticky top-0 z-50 bg-background/98 backdrop-blur-sm border-b border-border/60">
      <div className="container-academic">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src={logo}
              alt="Ayman Academy"
              className="h-16"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm transition-colors ${isActive(link.path)
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {t(link.label.ar, link.label.en)}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
              title={isDark ? t('وضع فاتح', 'Light mode') : t('وضع داكن', 'Dark mode')}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleLanguage}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {language === 'ar' ? 'EN' : 'عربي'}
            </button>

            {/* Auth Section - Desktop */}
            <div className="hidden md:block">
              {isLoading ? (
                <div className="w-24 h-8 bg-muted rounded animate-pulse" />
              ) : isAuthenticated ? (
                // Logged in: Show dropdown
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5">
                      <User className="w-4 h-4" />
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to={getDashboardLink()} className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="w-4 h-4" />
                        {t('لوحتي', 'My Dashboard')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('تسجيل الخروج', 'Sign Out')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Not logged in: Show login button
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <LogIn className="w-4 h-4" />
                    {t('تسجيل الدخول', 'Sign In')}
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-muted-foreground hover:text-foreground"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
