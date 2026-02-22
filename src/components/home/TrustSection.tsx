import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, BookCheck, Users, GraduationCap } from 'lucide-react';
import SectionTitle from '@/components/ui/SectionTitle';

const features = [
  {
    icon: Shield,
    title: { ar: 'محتوى موثوق', en: 'Trusted Content' },
    description: {
      ar: 'مناهج تعليمية معتمدة ومراجعة من قبل نخبة من الخبراء الأكاديميين',
      en: 'Accredited curricula reviewed by a select group of academic experts',
    },
  },
  {
    icon: BookCheck,
    title: { ar: 'جودة أكاديمية', en: 'Academic Quality' },
    description: {
      ar: 'نلتزم بأعلى المعايير التعليمية لضمان تفوق أبنائنا الطلاب',
      en: 'We adhere to the highest educational standards to ensure student excellence',
    },
  },
  {
    icon: Users,
    title: { ar: 'دعم تعليمي', en: 'Educational Support' },
    description: {
      ar: 'فريق متخصص من المعلمين والمساعدين لدعم رحلة الطالب التعليمية',
      en: 'A dedicated team of teachers and assistants to support the student journey',
    },
  },
  {
    icon: GraduationCap,
    title: { ar: 'شهادات معتمدة', en: 'Accredited Certificates' },
    description: {
      ar: 'نمنح شهادات إتمام رسمية توثق تقدم الطالب في كل مرحلة دراسية',
      en: 'We grant official completion certificates documenting student progress',
    },
  },
];

const TrustSection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-[#0A1128] relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="container-academic relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            {t('لماذا يختارنا أولياء الأمور؟', 'Why Parents Trust Us?')}
          </h2>
          <div className="h-1.5 w-20 bg-primary/40 mx-auto rounded-full mb-6" />
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed font-medium">
            {t(
              'نحن نضع مصلحة الطالب في المقام الأول، ونلتزم بتقديم بيئة تعليمية آمنة ومحفزة',
              'We put the student\'s interest first and are committed to providing a safe and stimulating learning environment'
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card/50 border border-border rounded-2xl p-8 transition-all duration-300 hover:bg-card hover:border-primary/20 group shadow-sm"
            >
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-6 border border-border transition-transform group-hover:scale-110">
                <feature.icon className="w-7 h-7 text-white/90" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">
                {t(feature.title.ar, feature.title.en)}
              </h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">
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
