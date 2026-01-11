import { useLanguage } from '@/contexts/LanguageContext';
import { UserCheck, BookMarked, PlayCircle, Award } from 'lucide-react';

const steps = [
  {
    icon: UserCheck,
    title: { ar: 'إنشاء الحساب', en: 'Create Account' },
    description: {
      ar: 'قم بتسجيل حساب جديد واختر الباقة المناسبة لاحتياجاتك التعليمية',
      en: 'Register a new account and choose the plan that suits your educational needs',
    },
  },
  {
    icon: BookMarked,
    title: { ar: 'اختر المرحلة', en: 'Select Stage' },
    description: {
      ar: 'حدد المرحلة الدراسية والمواد التي ترغب في دراستها',
      en: 'Choose the educational stage and subjects you wish to study',
    },
  },
  {
    icon: PlayCircle,
    title: { ar: 'ابدأ التعلم', en: 'Start Learning' },
    description: {
      ar: 'شاهد الدروس المصورة وتابع تقدمك في كل مادة',
      en: 'Watch video lessons and track your progress in each subject',
    },
  },
  {
    icon: Award,
    title: { ar: 'حقق التميز', en: 'Achieve Excellence' },
    description: {
      ar: 'أكمل الوحدات الدراسية واحصل على شهادات الإنجاز',
      en: 'Complete study units and earn certificates of achievement',
    },
  },
];

const HowItWorksSection = () => {
  const { t } = useLanguage();

  return (
    <section className="section-academic">
      <div className="container-academic">
        <div className="text-center mb-12">
          <h2 className="text-foreground mb-4">
            {t('كيف يعمل النظام', 'How It Works')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t(
              'خطوات بسيطة للوصول إلى تعليم أكاديمي متميز',
              'Simple steps to access premium academic education'
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <div className="text-sm font-medium text-academic-gold mb-2">
                {t(`الخطوة ${index + 1}`, `Step ${index + 1}`)}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t(step.title.ar, step.title.en)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
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
