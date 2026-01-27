import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { GraduationCap, BookOpen, School, ArrowLeft, ArrowRight } from 'lucide-react';

const stages = [
  {
    id: 'kindergarten',
    icon: GraduationCap,
    title: { ar: 'التمهيدي', en: 'Kindergarten' },
    description: {
      ar: 'أساسيات التعلم المبكر للأطفال من 4-6 سنوات',
      en: 'Early learning fundamentals for children aged 4-6',
    },
    subjects: { ar: '8 مواد', en: '8 Subjects' },
  },
  {
    id: 'primary',
    icon: BookOpen,
    title: { ar: 'الابتدائي', en: 'Primary' },
    description: {
      ar: 'بناء الأساس المعرفي في العلوم واللغات',
      en: 'Building a solid foundation in sciences and languages',
    },
    subjects: { ar: '12 مادة', en: '12 Subjects' },
  },
  {
    id: 'middle',
    icon: School,
    title: { ar: 'المتوسط', en: 'Middle School' },
    description: {
      ar: 'تطوير المهارات التحليلية والإبداعية',
      en: 'Developing analytical and creative skills',
    },
    subjects: { ar: '15 مادة', en: '15 Subjects' },
  },
];

const StagesSection = () => {
  const { t, direction } = useLanguage();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section className="section-academic">
      <div className="container-academic">
        <div className="text-center mb-10">
          <h2 className="text-foreground mb-3">
            {t('المراحل الدراسية', 'Educational Stages')}
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            {t(
              'منهج تعليمي متكامل يغطي جميع المراحل التأسيسية',
              'A comprehensive curriculum covering all foundational stages'
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {stages.map((stage) => (
            <Link
              key={stage.id}
              to={`/stages/${stage.id}`}
              className="academic-card group hover:border-primary/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center mb-4">
                <stage.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t(stage.title.ar, stage.title.en)}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t(stage.description.ar, stage.description.en)}
              </p>
              <div className="flex items-center justify-between">
                <span className="badge-stage">
                  {t(stage.subjects.ar, stage.subjects.en)}
                </span>
                <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  {t('عرض المواد', 'View Subjects')}
                  <ArrowIcon className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StagesSection;
