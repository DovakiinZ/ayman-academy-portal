import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Check, Users, BookOpen, Shield } from 'lucide-react';

const plans = [
  {
    id: 'basic',
    name: { ar: 'الباقة الأساسية', en: 'Basic Plan' },
    description: { ar: 'مناسبة للطالب الواحد', en: 'Suitable for one student' },
    price: { ar: '99', en: '99' },
    period: { ar: 'شهرياً', en: '/month' },
    currency: { ar: 'ر.س', en: 'SAR' },
    features: [
      { ar: 'حساب طالب واحد', en: 'One student account' },
      { ar: 'الوصول لجميع المواد', en: 'Access to all subjects' },
      { ar: 'تحميل الملفات التعليمية', en: 'Download educational files' },
      { ar: 'تتبع التقدم', en: 'Progress tracking' },
      { ar: 'دعم عبر البريد الإلكتروني', en: 'Email support' },
    ],
    icon: BookOpen,
    popular: false,
  },
  {
    id: 'family',
    name: { ar: 'باقة العائلة', en: 'Family Plan' },
    description: { ar: 'لعدة طلاب في نفس العائلة', en: 'For multiple students in the same family' },
    price: { ar: '199', en: '199' },
    period: { ar: 'شهرياً', en: '/month' },
    currency: { ar: 'ر.س', en: 'SAR' },
    features: [
      { ar: 'حتى 4 حسابات طلاب', en: 'Up to 4 student accounts' },
      { ar: 'الوصول لجميع المواد والمراحل', en: 'Access to all subjects and stages' },
      { ar: 'تحميل الملفات التعليمية', en: 'Download educational files' },
      { ar: 'تقارير تقدم لكل طالب', en: 'Progress reports for each student' },
      { ar: 'لوحة تحكم الوالدين', en: 'Parent dashboard' },
      { ar: 'دعم ذو أولوية', en: 'Priority support' },
    ],
    icon: Users,
    popular: true,
  },
  {
    id: 'annual',
    name: { ar: 'الباقة السنوية', en: 'Annual Plan' },
    description: { ar: 'توفير أكبر مع الاشتراك السنوي', en: 'Greater savings with annual subscription' },
    price: { ar: '899', en: '899' },
    period: { ar: 'سنوياً', en: '/year' },
    currency: { ar: 'ر.س', en: 'SAR' },
    features: [
      { ar: 'جميع مزايا باقة العائلة', en: 'All Family Plan features' },
      { ar: 'توفير شهرين مجاناً', en: 'Save 2 months free' },
      { ar: 'شهادات إتمام رسمية', en: 'Official completion certificates' },
      { ar: 'جلسات استشارية أكاديمية', en: 'Academic consultation sessions' },
      { ar: 'دعم هاتفي مباشر', en: 'Direct phone support' },
    ],
    icon: Shield,
    popular: false,
  },
];

const Plans = () => {
  const { t } = useLanguage();

  return (
    <Layout>
      {/* Header */}
      <section className="bg-secondary/30 py-12 md:py-16 border-b border-border">
        <div className="container-academic text-center">
          <h1 className="text-foreground mb-4">
            {t('رسوم الاشتراك', 'Subscription Plans')}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t(
              'اختر الباقة المناسبة لاحتياجاتك التعليمية. جميع الباقات تشمل الوصول الكامل للمحتوى الأكاديمي',
              'Choose the plan that suits your educational needs. All plans include full access to academic content'
            )}
          </p>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="section-academic">
        <div className="container-academic">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`academic-card relative ${
                  plan.popular ? 'border-primary shadow-md' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 start-1/2 -translate-x-1/2 badge-gold">
                    {t('الأكثر اختياراً', 'Most Popular')}
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <plan.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    {t(plan.name.ar, plan.name.en)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(plan.description.ar, plan.description.en)}
                  </p>
                </div>

                <div className="text-center mb-6 pb-6 border-b border-border">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      {t(plan.price.ar, plan.price.en)}
                    </span>
                    <span className="text-muted-foreground">
                      {t(plan.currency.ar, plan.currency.en)}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {t(plan.period.ar, plan.period.en)}
                  </span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">
                        {t(feature.ar, feature.en)}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                  {t('اشترك الآن', 'Subscribe Now')}
                </Button>
              </div>
            ))}
          </div>

          {/* Policies */}
          <div className="mt-16 max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold text-foreground text-center mb-8">
              {t('السياسات والشروط', 'Policies & Terms')}
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <Link to="/terms" className="academic-card hover:shadow-md transition-all">
                <h3 className="font-medium text-foreground mb-2">
                  {t('الشروط والأحكام', 'Terms of Service')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('اطلع على شروط استخدام المنصة', 'Review platform usage terms')}
                </p>
              </Link>
              <Link to="/privacy" className="academic-card hover:shadow-md transition-all">
                <h3 className="font-medium text-foreground mb-2">
                  {t('سياسة الخصوصية', 'Privacy Policy')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('كيف نحمي بياناتك الشخصية', 'How we protect your data')}
                </p>
              </Link>
              <Link to="/refund" className="academic-card hover:shadow-md transition-all">
                <h3 className="font-medium text-foreground mb-2">
                  {t('سياسة الاسترداد', 'Refund Policy')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('شروط استرداد الرسوم', 'Fee refund conditions')}
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Plans;
