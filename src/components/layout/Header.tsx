import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Menu, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

const Header = () => {
  const { t, toggleLanguage, language } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: '/', label: { ar: 'الرئيسية', en: 'Home' } },
    { path: '/stages', label: { ar: 'المراحل الدراسية', en: 'Stages' } },
    { path: '/instructors', label: { ar: 'المعلمون', en: 'Instructors' } },
    { path: '/plans', label: { ar: 'الاشتراكات', en: 'Plans' } },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-background/98 backdrop-blur-sm border-b border-border/60">
      <div className="container-academic">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src={logo}
              alt={t('أكاديمية أيمن', 'Ayman Academy')}
              className="h-8 md:h-9 w-auto"
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
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {language === 'ar' ? 'EN' : 'عربي'}
            </button>

            <Link to="/account" className="hidden md:block">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <User className="w-4 h-4" />
                {t('حسابي', 'Account')}
              </Button>
            </Link>

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
              <Link
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground rounded"
              >
                {t('حسابي', 'My Account')}
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
