import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Menu, X, User, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container-academic">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">أ</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">
                {t('أكاديمية أيمن', 'Ayman Academy')}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t('التعليم الأكاديمي المتميز', 'Premium Academic Education')}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-primary'
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
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md"
            >
              <Globe className="w-4 h-4" />
              <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            <Link to="/account" className="hidden md:block">
              <Button variant="outline" size="sm" className="gap-2">
                <User className="w-4 h-4" />
                {t('حسابي', 'Account')}
              </Button>
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(link.path)
                      ? 'bg-secondary text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {t(link.label.ar, link.label.en)}
                </Link>
              ))}
              <Link
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md"
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
