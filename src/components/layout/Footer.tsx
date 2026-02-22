import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import logo from '@/assets/logo.png';

const Footer = () => {
  const { t } = useLanguage();

  const footerLinks = {
    academy: [
      { path: '/stages', label: { ar: 'المراحل الدراسية', en: 'Educational Stages' } },
    ],
    support: [
      { path: '/contact', label: { ar: 'تواصل معنا', en: 'Contact Us' } },
      { path: '/faq', label: { ar: 'الأسئلة الشائعة', en: 'FAQ' } },
    ],
    legal: [
      { path: '/privacy', label: { ar: 'سياسة الخصوصية', en: 'Privacy Policy' } },
      { path: '/terms', label: { ar: 'الشروط والأحكام', en: 'Terms of Service' } },
    ],
  };

  return (
    <footer className="bg-slate-50 border-t border-slate-900/[0.06] transition-colors relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-900/5 to-transparent" />
      <div className="container-academic py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-6">
              <img
                src={logo}
                alt={t('أكاديمية أيمن', 'Ayman Academy')}
                className="h-20"
              />
            </Link>
            <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xs">
              {t(
                'مؤسسة تعليمية أكاديمية متخصصة في تقديم تعليم متميز للمراحل التأسيسية.',
                'An academic educational institution specialized in providing premium education for foundational stages.'
              )}
            </p>
          </div>

          {/* Academy Links */}
          <div>
            <h4 className="font-black text-slate-900 mb-6 text-[10px] uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              {t('الأكاديمية', 'Academy')}
            </h4>
            <ul className="space-y-3">
              {footerLinks.academy.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm font-medium text-slate-500 hover:text-primary transition-colors"
                  >
                    {t(link.label.ar, link.label.en)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-black text-slate-900 mb-6 text-[10px] uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              {t('الدعم', 'Support')}
            </h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm font-medium text-slate-500 hover:text-primary transition-colors"
                  >
                    {t(link.label.ar, link.label.en)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-black text-slate-900 mb-6 text-[10px] uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              {t('السياسات', 'Policies')}
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm font-medium text-slate-500 hover:text-primary transition-colors"
                  >
                    {t(link.label.ar, link.label.en)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-slate-900/[0.04]">
          <p className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-widest">
            {t(
              '© 2026 أكاديمية أيمن. جميع الحقوق محفوظة.',
              '© 2026 Ayman Academy. All rights reserved.'
            )}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
