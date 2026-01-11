import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { GraduationCap, BookOpen, School, ArrowLeft, ArrowRight } from 'lucide-react';

const stages = [
  {
    id: 'kindergarten',
    icon: GraduationCap,
    title: { ar: 'رياض الأطفال', en: 'Kindergarten' },
    description: {
      ar: 'أساسيات التعلم المبكر وتنمية المهارات الأولية للأطفال من 4-6 سنوات. يركز هذا البرنامج على بناء الأسس الأولى للقراءة والكتابة والحساب بطرق تفاعلية ومناسبة للفئة العمرية.',
      en: 'Early learning fundamentals and initial skills development for children aged 4-6. This program focuses on building the first foundations of reading, writing, and arithmetic through interactive and age-appropriate methods.',
    },
    ageRange: { ar: '4-6 سنوات', en: '4-6 Years' },
    subjects: 8,
    lessons: 120,
  },
  {
    id: 'primary',
    icon: BookOpen,
    title: { ar: 'المرحلة الابتدائية', en: 'Primary Stage' },
    description: {
      ar: 'بناء الأساس المعرفي المتين في العلوم واللغات والرياضيات. منهج شامل يغطي الصفوف من الأول إلى السادس الابتدائي مع تركيز على المهارات الأساسية والتفكير النقدي.',
      en: 'Building a solid foundation in sciences, languages, and mathematics. A comprehensive curriculum covering grades 1-6 with emphasis on fundamental skills and critical thinking.',
    },
    ageRange: { ar: '6-12 سنة', en: '6-12 Years' },
    subjects: 12,
    lessons: 280,
  },
  {
    id: 'middle',
    icon: School,
    title: { ar: 'المرحلة المتوسطة', en: 'Middle School' },
    description: {
      ar: 'تطوير المهارات التحليلية والإبداعية والاستعداد للمراحل المتقدمة. يشمل هذا البرنامج مواد متقدمة تؤهل الطلاب للمرحلة الثانوية والتعليم العالي.',
      en: 'Developing analytical and creative skills in preparation for advanced stages. This program includes advanced subjects that prepare students for high school and higher education.',
    },
    ageRange: { ar: '12-15 سنة', en: '12-15 Years' },
    subjects: 15,
    lessons: 350,
  },
];

const Stages = () => {
  const { t, direction } = useLanguage();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <Layout>
      {/* Header */}
      <section className="bg-secondary/30 py-12 md:py-16 border-b border-border">
        <div className="container-academic">
          <h1 className="text-foreground mb-4">
            {t('المراحل الدراسية', 'Educational Stages')}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            {t(
              'اختر المرحلة الدراسية المناسبة للوصول إلى المواد والدروس التعليمية',
              'Select the appropriate educational stage to access subjects and lessons'
            )}
          </p>
        </div>
      </section>

      {/* Stages Grid */}
      <section className="section-academic">
        <div className="container-academic">
          <div className="space-y-6">
            {stages.map((stage) => (
              <Link
                key={stage.id}
                to={`/stages/${stage.id}`}
                className="academic-card flex flex-col md:flex-row md:items-center gap-6 hover:shadow-md transition-all group"
              >
                <div className="w-16 h-16 rounded bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <stage.icon className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    {t(stage.title.ar, stage.title.en)}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                    {t(stage.description.ar, stage.description.en)}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="badge-stage">
                      {t(`الفئة العمرية: ${stage.ageRange.ar}`, `Age: ${stage.ageRange.en}`)}
                    </span>
                    <span className="badge-stage">
                      {t(`${stage.subjects} مواد`, `${stage.subjects} Subjects`)}
                    </span>
                    <span className="badge-stage">
                      {t(`${stage.lessons} درس`, `${stage.lessons} Lessons`)}
                    </span>
                  </div>
                </div>
                <div className="hidden md:flex items-center text-primary">
                  <ArrowIcon className="w-5 h-5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Stages;
