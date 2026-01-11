import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const instructors = [
  {
    id: 1,
    name: { ar: 'د. أحمد الفاروق', en: 'Dr. Ahmed Al-Farouq' },
    specialty: { ar: 'الرياضيات والعلوم', en: 'Mathematics & Science' },
    experience: { ar: '15 عاماً', en: '15 Years' },
    lessons: 48,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 2,
    name: { ar: 'أ. فاطمة السعيد', en: 'Ms. Fatima Al-Saeed' },
    specialty: { ar: 'اللغة العربية', en: 'Arabic Language' },
    experience: { ar: '12 عاماً', en: '12 Years' },
    lessons: 36,
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 3,
    name: { ar: 'أ. محمد العلي', en: 'Mr. Mohammed Al-Ali' },
    specialty: { ar: 'اللغة الإنجليزية', en: 'English Language' },
    experience: { ar: '10 أعوام', en: '10 Years' },
    lessons: 42,
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
  },
];

const InstructorsSection = () => {
  const { t } = useLanguage();

  return (
    <section className="section-academic">
      <div className="container-academic">
        <div className="text-center mb-12">
          <h2 className="text-foreground mb-4">
            {t('الهيئة التعليمية', 'Faculty')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t(
              'نخبة من المعلمين المتخصصين ذوي الخبرة الأكاديمية العالية',
              'A select group of specialized educators with extensive academic experience'
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {instructors.map((instructor) => (
            <div key={instructor.id} className="academic-card text-center">
              <img
                src={instructor.image}
                alt={t(instructor.name.ar, instructor.name.en)}
                className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-2 border-border"
              />
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {t(instructor.name.ar, instructor.name.en)}
              </h3>
              <p className="text-sm text-primary mb-3">
                {t(instructor.specialty.ar, instructor.specialty.en)}
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>{t(`خبرة ${instructor.experience.ar}`, `${instructor.experience.en} Experience`)}</span>
                <span className="text-border">|</span>
                <span>{t(`${instructor.lessons} درساً`, `${instructor.lessons} Lessons`)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            to="/instructors"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {t('تعرف على جميع المعلمين ←', 'Meet All Instructors →')}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default InstructorsSection;
