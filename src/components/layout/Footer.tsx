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
      { path: '/refund-policy', label: { ar: 'سياسة الاسترداد', en: 'Refund Policy' } },
      { path: '/certificate-policy', label: { ar: 'سياسة الشهادات', en: 'Certificate Policy' } },
    ],
  };

  return (
    <footer className="bg-secondary/40 border-t border-border">
      <div className="container-academic py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-3">
              <img
                src={logo}
                alt={t('أكاديمية أيمن', 'Ayman Academy')}
                className="h-16"
              />
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              {t(
                'مؤسسة تعليمية أكاديمية متخصصة في تقديم تعليم متميز للمراحل التأسيسية.',
                'An academic educational institution specialized in providing premium education for foundational stages.'
              )}
            </p>
          </div>

          {/* Academy Links */}
          <div>
            <h4 className="font-medium text-foreground mb-3 text-xs">
              {t('الأكاديمية', 'Academy')}
            </h4>
            <ul className="space-y-2">
              {footerLinks.academy.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(link.label.ar, link.label.en)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-medium text-foreground mb-3 text-xs">
              {t('الدعم', 'Support')}
            </h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(link.label.ar, link.label.en)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-medium text-foreground mb-3 text-xs">
              {t('السياسات', 'Policies')}
            </h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(link.label.ar, link.label.en)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
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
