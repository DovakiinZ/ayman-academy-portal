import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  const footerLinks = {
    academy: [
      { path: '/stages', label: { ar: 'المراحل الدراسية', en: 'Educational Stages' } },
      { path: '/instructors', label: { ar: 'المعلمون', en: 'Instructors' } },
      { path: '/plans', label: { ar: 'الاشتراكات', en: 'Subscription Plans' } },
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
    <footer className="bg-secondary/50 border-t border-border">
      <div className="container-academic py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">أ</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {t('أكاديمية أيمن', 'Ayman Academy')}
                </h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                'مؤسسة تعليمية أكاديمية متخصصة في تقديم تعليم متميز للمراحل التأسيسية.',
                'An academic educational institution specialized in providing premium education for foundational stages.'
              )}
            </p>
          </div>

          {/* Academy Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">
              {t('الأكاديمية', 'Academy')}
            </h4>
            <ul className="space-y-2">
              {footerLinks.academy.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(link.label.ar, link.label.en)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">
              {t('الدعم', 'Support')}
            </h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(link.label.ar, link.label.en)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">
              {t('السياسات', 'Policies')}
            </h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(link.label.ar, link.label.en)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            {t(
              '© 2024 أكاديمية أيمن. جميع الحقوق محفوظة.',
              '© 2024 Ayman Academy. All rights reserved.'
            )}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
