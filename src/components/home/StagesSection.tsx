import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { GraduationCap, BookOpen, School } from 'lucide-react';

const stages = [
  {
    id: 'kindergarten',
    icon: GraduationCap,
    title: { ar: 'رياض الأطفال', en: 'Kindergarten' },
    description: {
      ar: 'أساسيات التعلم المبكر وتنمية المهارات الأولية للأطفال من 4-6 سنوات',
      en: 'Early learning fundamentals and initial skills development for children aged 4-6',
    },
    subjects: { ar: '8 مواد تعليمية', en: '8 Educational Subjects' },
  },
  {
    id: 'primary',
    icon: BookOpen,
    title: { ar: 'المرحلة الابتدائية', en: 'Primary Stage' },
    description: {
      ar: 'بناء الأساس المعرفي المتين في العلوم واللغات والرياضيات',
      en: 'Building a solid foundation in sciences, languages, and mathematics',
    },
    subjects: { ar: '12 مادة تعليمية', en: '12 Educational Subjects' },
  },
  {
    id: 'middle',
    icon: School,
    title: { ar: 'المرحلة المتوسطة', en: 'Middle School' },
    description: {
      ar: 'تطوير المهارات التحليلية والإبداعية والاستعداد للمراحل المتقدمة',
      en: 'Developing analytical and creative skills in preparation for advanced stages',
    },
    subjects: { ar: '15 مادة تعليمية', en: '15 Educational Subjects' },
  },
];

const StagesSection = () => {
  const { t } = useLanguage();

  return (
    <section className="section-academic bg-secondary/30">
      <div className="container-academic">
        <div className="text-center mb-12">
          <h2 className="text-foreground mb-4">
            {t('المراحل الدراسية', 'Educational Stages')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t(
              'منهج تعليمي متكامل يغطي جميع المراحل التأسيسية بمحتوى أكاديمي معتمد',
              'A comprehensive curriculum covering all foundational stages with accredited academic content'
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {stages.map((stage) => (
            <Link
              key={stage.id}
              to={`/stages/${stage.id}`}
              className="academic-card hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <stage.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t(stage.title.ar, stage.title.en)}
              </h3>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                {t(stage.description.ar, stage.description.en)}
              </p>
              <span className="badge-stage">
                {t(stage.subjects.ar, stage.subjects.en)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StagesSection;
