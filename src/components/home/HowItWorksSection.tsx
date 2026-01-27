import { useLanguage } from '@/contexts/LanguageContext';
import { Layers, BookMarked, Play } from 'lucide-react';

const steps = [
  {
    num: '١',
    icon: Layers,
    title: { ar: 'اختر المرحلة', en: 'Choose Stage' },
    description: {
      ar: 'حدد المرحلة الدراسية المناسبة',
      en: 'Select the appropriate educational stage',
    },
  },
  {
    num: '٢',
    icon: BookMarked,
    title: { ar: 'اختر المادة', en: 'Select Subject' },
    description: {
      ar: 'اختر المادة التي ترغب في دراستها',
      en: 'Choose the subject you wish to study',
    },
  },
  {
    num: '٣',
    icon: Play,
    title: { ar: 'شاهد الدروس', en: 'Watch Lessons' },
    description: {
      ar: 'محتوى تعليمي مخصص للمشتركين',
      en: 'Educational content for subscribers',
    },
  },
];

const HowItWorksSection = () => {
  const { t } = useLanguage();

  return (
    <section className="section-academic bg-secondary/30">
      <div className="container-academic">
        <div className="text-center mb-10">
          <h2 className="text-foreground mb-3">
            {t('كيف تعمل الأكاديمية؟', 'How It Works')}
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            {t(
              'خطوات بسيطة للوصول إلى المحتوى التعليمي',
              'Simple steps to access educational content'
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <div className="text-xs text-academic-gold font-medium mb-2">
                {t(`الخطوة ${step.num}`, `Step ${index + 1}`)}
              </div>
              <h3 className="text-base font-medium text-foreground mb-2">
                {t(step.title.ar, step.title.en)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(step.description.ar, step.description.en)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
