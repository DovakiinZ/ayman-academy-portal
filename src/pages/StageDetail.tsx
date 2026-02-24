import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { Calculator, BookOpen, Beaker, Globe, Palette, Music, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const stagesData = {
  kindergarten: {
    title: { ar: 'رياض الأطفال', en: 'Kindergarten' },
    subjects: [
      { id: 'arabic-kg', icon: BookOpen, title: { ar: 'اللغة العربية', en: 'Arabic' }, lessons: 24 },
      { id: 'math-kg', icon: Calculator, title: { ar: 'الحساب', en: 'Mathematics' }, lessons: 20 },
      { id: 'english-kg', icon: Globe, title: { ar: 'اللغة الإنجليزية', en: 'English' }, lessons: 18 },
      { id: 'science-kg', icon: Beaker, title: { ar: 'اكتشاف العالم', en: 'Exploring the World' }, lessons: 16 },
      { id: 'art-kg', icon: Palette, title: { ar: 'الفنون', en: 'Arts' }, lessons: 14 },
      { id: 'music-kg', icon: Music, title: { ar: 'الأناشيد', en: 'Songs & Rhymes' }, lessons: 12 },
    ],
  },
  primary: {
    title: { ar: 'المرحلة الابتدائية', en: 'Primary Stage' },
    subjects: [
      { id: 'arabic-primary', icon: BookOpen, title: { ar: 'اللغة العربية', en: 'Arabic' }, lessons: 48 },
      { id: 'math-primary', icon: Calculator, title: { ar: 'الرياضيات', en: 'Mathematics' }, lessons: 56 },
      { id: 'science-primary', icon: Beaker, title: { ar: 'العلوم', en: 'Science' }, lessons: 42 },
      { id: 'english-primary', icon: Globe, title: { ar: 'اللغة الإنجليزية', en: 'English' }, lessons: 45 },
      { id: 'islamic-primary', icon: BookOpen, title: { ar: 'التربية الإسلامية', en: 'Islamic Studies' }, lessons: 32 },
      { id: 'social-primary', icon: Globe, title: { ar: 'الدراسات الاجتماعية', en: 'Social Studies' }, lessons: 28 },
    ],
  },
  middle: {
    title: { ar: 'المرحلة المتوسطة', en: 'Middle School' },
    subjects: [
      { id: 'arabic-middle', icon: BookOpen, title: { ar: 'اللغة العربية', en: 'Arabic' }, lessons: 60 },
      { id: 'math-middle', icon: Calculator, title: { ar: 'الرياضيات', en: 'Mathematics' }, lessons: 72 },
      { id: 'science-middle', icon: Beaker, title: { ar: 'العلوم', en: 'Science' }, lessons: 65 },
      { id: 'physics-middle', icon: Beaker, title: { ar: 'الفيزياء', en: 'Physics' }, lessons: 45 },
      { id: 'chemistry-middle', icon: Beaker, title: { ar: 'الكيمياء', en: 'Chemistry' }, lessons: 42 },
      { id: 'english-middle', icon: Globe, title: { ar: 'اللغة الإنجليزية', en: 'English' }, lessons: 55 },
    ],
  },
};

const StageDetail = () => {
  const { stageId } = useParams();
  const { t, direction } = useLanguage();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;

  const stage = stagesData[stageId as keyof typeof stagesData];

  if (!stage) {
    return (
      <Layout>
        <div className="container-academic py-20 text-center">
          <h1>{t('المرحلة غير موجودة', 'Stage Not Found')}</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <section className="bg-secondary/30 py-12 md:py-16 border-b border-border">
        <div className="container-academic">
          <Link
            to="/stages"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <BackIcon className="w-4 h-4" />
            {t('جميع المراحل', 'All Stages')}
          </Link>
          <h1 className="text-foreground mb-4">
            {t(stage.title.ar, stage.title.en)}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            {t(
              'اختر المادة الدراسية للوصول إلى الدروس والمحتوى التعليمي',
              'Select a subject to access lessons and educational content'
            )}
          </p>
        </div>
      </section>

      {/* Subjects Grid */}
      <section className="section-academic">
        <div className="container-academic">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stage.subjects.map((subject) => (
              <Link
                key={subject.id}
                to={`/stages/${stageId}/${subject.id}`}
                className="academic-card hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <subject.icon className="w-6 h-6 text-primary" />
                  </div>
                  <ArrowIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t(subject.title.ar, subject.title.en)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`${subject.lessons} درساً`, `${subject.lessons} Lessons`)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default StageDetail;
