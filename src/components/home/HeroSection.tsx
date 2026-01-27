import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import heroImage from '@/assets/hero-library.jpg';

const HeroSection = () => {
  const { t, direction } = useLanguage();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-[420px] md:min-h-[480px] flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt={t('مكتبة أكاديمية', 'Academic Library')}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/50" />
      </div>

      {/* Content */}
      <div className="relative container-academic py-16 md:py-20">
        <div className="max-w-xl">
          <p className="eyebrow mb-3">
            {t('أكاديمية تعليمية', 'Educational Academy')}
          </p>
          <h1 className="text-foreground mb-4">
            {t('تعليم أكاديمي متميز', 'Premium Academic Education')}
          </h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            {t(
              'منهج تعليمي متكامل يجمع بين الأساليب الأكاديمية الحديثة والقيم التربوية الراسخة.',
              'A comprehensive curriculum combining modern academic methods with established educational values.'
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/stages">
              <Button size="default" className="gap-2">
                {t('استعرض المراحل', 'Explore Stages')}
                <ArrowIcon className="w-4 h-4" />
              </Button>
            </Link>
            <Link
              to="/plans"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('معلومات الاشتراك', 'Subscription Info')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
