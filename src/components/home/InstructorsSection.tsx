import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const instructors = [
  {
    id: 1,
    name: { ar: 'د. أحمد الفاروق', en: 'Dr. Ahmed Al-Farouq' },
    specialty: { ar: 'الرياضيات والعلوم', en: 'Mathematics & Science' },
    experience: { ar: '15 عاماً', en: '15 Years' },
    stages: { ar: 'الابتدائي والمتوسط', en: 'Primary & Middle' },
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 2,
    name: { ar: 'أ. فاطمة السعيد', en: 'Ms. Fatima Al-Saeed' },
    specialty: { ar: 'اللغة العربية', en: 'Arabic Language' },
    experience: { ar: '12 عاماً', en: '12 Years' },
    stages: { ar: 'جميع المراحل', en: 'All Stages' },
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 3,
    name: { ar: 'أ. محمد العلي', en: 'Mr. Mohammed Al-Ali' },
    specialty: { ar: 'اللغة الإنجليزية', en: 'English Language' },
    experience: { ar: '10 أعوام', en: '10 Years' },
    stages: { ar: 'الابتدائي والمتوسط', en: 'Primary & Middle' },
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
  },
];

const InstructorsSection = () => {
  const { t } = useLanguage();

  return (
    <section className="section-academic bg-secondary/30">
      <div className="container-academic">
        <div className="text-center mb-10">
          <h2 className="text-foreground mb-3">
            {t('الهيئة التعليمية', 'Faculty')}
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            {t(
              'نخبة من المعلمين المتخصصين ذوي الخبرة الأكاديمية',
              'A select group of specialized educators with academic experience'
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {instructors.map((instructor) => (
            <div key={instructor.id} className="academic-card text-center">
              <img
                src={instructor.image}
                alt={t(instructor.name.ar, instructor.name.en)}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border border-border"
              />
              <h3 className="text-base font-medium text-foreground mb-1">
                {t(instructor.name.ar, instructor.name.en)}
              </h3>
              <p className="text-sm text-primary mb-3">
                {t(instructor.specialty.ar, instructor.specialty.en)}
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>{t(`خبرة ${instructor.experience.ar}`, `${instructor.experience.en} Experience`)}</p>
                <p>{t(instructor.stages.ar, instructor.stages.en)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            to="/instructors"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('تعرف على جميع المعلمين', 'Meet All Instructors')}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default InstructorsSection;
