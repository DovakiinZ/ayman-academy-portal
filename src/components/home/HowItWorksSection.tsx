import { useLanguage } from '@/contexts/LanguageContext';
import { Layers, BookMarked, Play } from 'lucide-react';
import SectionTitle from '@/components/ui/SectionTitle';

const steps = [
  {
    num: '١',
    icon: Layers,
    title: { ar: 'اختر المرحلة', en: 'Choose Stage' },
    description: {
      ar: 'حدد المرحلة الدراسية المناسبة لمستواك الأكاديمي',
      en: 'Select the appropriate educational stage for your academic level',
    },
  },
  {
    num: '٢',
    icon: BookMarked,
    title: { ar: 'اختر المادة', en: 'Select Subject' },
    description: {
      ar: 'استكشف المواد الدراسية التفاعلية المتاحة',
      en: 'Explore the available interactive educational subjects',
    },
  },
  {
    num: '٣',
    icon: Play,
    title: { ar: 'ابدأ التعلم', en: 'Start Learning' },
    description: {
      ar: 'استمتع بمشاهدة الدروس التعليمية عالية الجودة',
      en: 'Enjoy watching high-quality educational videos',
    },
  },
];

const HowItWorksSection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-background/50">
      <div className="max-w-7xl mx-auto px-6">
        <SectionTitle
          title={t('منهجية التعلم', 'Learning Methodology')}
          subtitle={t(
            'خطوات بسيطة ومدروسة للوصول إلى بيئة تعليمية متكاملة',
            'Simple and thoughtful steps to access an integrated learning environment'
          )}
          align="center"
        />

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          {steps.map((step, index) => (
            <div key={index} className="premium-card premium-card-accent p-8 text-center bg-card group border border-border">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-8 transition-colors group-hover:bg-primary/10">
                <step.icon className="w-8 h-8 text-primary/80" strokeWidth={1.5} />
              </div>
              <div className="inline-block px-3 py-1 rounded-full bg-secondary text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
                {t(`الخطوة ${step.num}`, `Step ${index + 1}`)}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">
                {t(step.title.ar, step.title.en)}
              </h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">
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
