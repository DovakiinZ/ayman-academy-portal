import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import heroImage from '@/assets/hero-library.jpg';

const HeroSection = () => {
  const { t, direction } = useLanguage();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-[600px] md:min-h-[700px] flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt={t('مكتبة أكاديمية', 'Academic Library')}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
      </div>

      {/* Content */}
      <div className="relative container-academic py-20 md:py-32">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-academic-gold mb-4 tracking-wide">
            {t('مؤسسة تعليمية أكاديمية', 'Academic Educational Institution')}
          </p>
          <h1 className="text-foreground mb-6">
            {t(
              'تعليم أكاديمي متميز للمراحل التأسيسية',
              'Premium Academic Education for Foundational Stages'
            )}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {t(
              'نقدم في أكاديمية أيمن منهجاً تعليمياً متكاملاً يجمع بين الأساليب الأكاديمية الحديثة والقيم التربوية الراسخة، لبناء جيل متميز علمياً وأخلاقياً.',
              'At Ayman Academy, we provide a comprehensive educational curriculum that combines modern academic methods with established educational values, building a generation distinguished in knowledge and character.'
            )}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/stages">
              <Button size="lg" className="gap-2">
                {t('استعرض المراحل الدراسية', 'Explore Stages')}
                <ArrowIcon className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/plans">
              <Button variant="outline" size="lg">
                {t('معلومات الاشتراك', 'Subscription Info')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
