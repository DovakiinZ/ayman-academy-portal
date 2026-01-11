import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, BookCheck, Users, GraduationCap } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: { ar: 'محتوى موثوق', en: 'Trusted Content' },
    description: {
      ar: 'مناهج معتمدة ومراجعة من قبل خبراء تربويين',
      en: 'Accredited curricula reviewed by educational experts',
    },
  },
  {
    icon: BookCheck,
    title: { ar: 'جودة أكاديمية', en: 'Academic Quality' },
    description: {
      ar: 'معايير تعليمية عالية ومحتوى محدث باستمرار',
      en: 'High educational standards and continuously updated content',
    },
  },
  {
    icon: Users,
    title: { ar: 'دعم مستمر', en: 'Continuous Support' },
    description: {
      ar: 'فريق دعم متخصص لمساعدة الطلاب وأولياء الأمور',
      en: 'Dedicated support team to assist students and parents',
    },
  },
  {
    icon: GraduationCap,
    title: { ar: 'شهادات معتمدة', en: 'Certified Credentials' },
    description: {
      ar: 'شهادات إتمام معترف بها عند إكمال كل مرحلة',
      en: 'Recognized completion certificates upon finishing each stage',
    },
  },
];

const TrustSection = () => {
  const { t } = useLanguage();

  return (
    <section className="section-academic bg-primary text-primary-foreground">
      <div className="container-academic">
        <div className="text-center mb-12">
          <h2 className="mb-4">
            {t('لماذا أكاديمية أيمن؟', 'Why Ayman Academy?')}
          </h2>
          <p className="opacity-80 max-w-2xl mx-auto">
            {t(
              'نلتزم بأعلى معايير الجودة الأكاديمية لضمان تجربة تعليمية متميزة',
              'We adhere to the highest academic quality standards to ensure an excellent learning experience'
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-primary-foreground/10 rounded-md p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">
                {t(feature.title.ar, feature.title.en)}
              </h3>
              <p className="text-sm opacity-80">
                {t(feature.description.ar, feature.description.en)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
