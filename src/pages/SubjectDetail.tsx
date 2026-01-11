import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { Play, Lock, Clock, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

const lessonsData = [
  {
    id: 1,
    unit: { ar: 'الوحدة الأولى: المقدمة', en: 'Unit 1: Introduction' },
    lessons: [
      { id: 101, title: { ar: 'مقدمة في المادة', en: 'Introduction to the Subject' }, duration: '12:30', isPreview: true, hasFiles: true },
      { id: 102, title: { ar: 'الأساسيات والمفاهيم', en: 'Basics and Concepts' }, duration: '15:45', isPreview: true, hasFiles: false },
      { id: 103, title: { ar: 'التطبيقات العملية', en: 'Practical Applications' }, duration: '18:20', isPreview: false, hasFiles: true },
    ],
  },
  {
    id: 2,
    unit: { ar: 'الوحدة الثانية: التعمق', en: 'Unit 2: Deep Dive' },
    lessons: [
      { id: 201, title: { ar: 'الفهم المتقدم', en: 'Advanced Understanding' }, duration: '20:15', isPreview: false, hasFiles: true },
      { id: 202, title: { ar: 'التحليل والاستنتاج', en: 'Analysis and Deduction' }, duration: '22:00', isPreview: false, hasFiles: false },
      { id: 203, title: { ar: 'حل المشكلات', en: 'Problem Solving' }, duration: '25:30', isPreview: false, hasFiles: true },
      { id: 204, title: { ar: 'مراجعة الوحدة', en: 'Unit Review' }, duration: '14:45', isPreview: false, hasFiles: false },
    ],
  },
  {
    id: 3,
    unit: { ar: 'الوحدة الثالثة: الإتقان', en: 'Unit 3: Mastery' },
    lessons: [
      { id: 301, title: { ar: 'المهارات المتقدمة', en: 'Advanced Skills' }, duration: '28:00', isPreview: false, hasFiles: true },
      { id: 302, title: { ar: 'المشاريع التطبيقية', en: 'Applied Projects' }, duration: '35:20', isPreview: false, hasFiles: true },
      { id: 303, title: { ar: 'الاختبار الشامل', en: 'Comprehensive Test' }, duration: '45:00', isPreview: false, hasFiles: true },
    ],
  },
];

const SubjectDetail = () => {
  const { stageId, subjectId } = useParams();
  const { t, direction } = useLanguage();
  const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;

  // Get subject name from subjectId
  const subjectName = subjectId?.includes('arabic')
    ? { ar: 'اللغة العربية', en: 'Arabic' }
    : subjectId?.includes('math')
    ? { ar: 'الرياضيات', en: 'Mathematics' }
    : subjectId?.includes('science')
    ? { ar: 'العلوم', en: 'Science' }
    : subjectId?.includes('english')
    ? { ar: 'اللغة الإنجليزية', en: 'English' }
    : { ar: 'المادة', en: 'Subject' };

  const stageName = stageId === 'kindergarten'
    ? { ar: 'رياض الأطفال', en: 'Kindergarten' }
    : stageId === 'primary'
    ? { ar: 'المرحلة الابتدائية', en: 'Primary' }
    : { ar: 'المرحلة المتوسطة', en: 'Middle School' };

  return (
    <Layout>
      {/* Header */}
      <section className="bg-secondary/30 py-12 md:py-16 border-b border-border">
        <div className="container-academic">
          <Link
            to={`/stages/${stageId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <BackIcon className="w-4 h-4" />
            {t(stageName.ar, stageName.en)}
          </Link>
          <h1 className="text-foreground mb-2">
            {t(subjectName.ar, subjectName.en)}
          </h1>
          <p className="text-muted-foreground">
            {t(stageName.ar, stageName.en)}
          </p>
        </div>
      </section>

      {/* Lessons List */}
      <section className="section-academic">
        <div className="container-academic">
          <div className="space-y-8">
            {lessonsData.map((unit) => (
              <div key={unit.id}>
                <h2 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b border-border">
                  {t(unit.unit.ar, unit.unit.en)}
                </h2>
                <div className="space-y-3">
                  {unit.lessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      to={lesson.isPreview ? `/lesson/${lesson.id}` : '#'}
                      className={`academic-card py-4 flex items-center gap-4 ${
                        !lesson.isPreview ? 'lesson-locked cursor-default' : 'hover:shadow-md'
                      } transition-all group`}
                    >
                      {/* Play/Lock Icon */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          lesson.isPreview
                            ? 'bg-primary/10 text-primary group-hover:bg-primary/15'
                            : 'bg-muted text-muted-foreground'
                        } transition-colors`}
                      >
                        {lesson.isPreview ? (
                          <Play className="w-4 h-4 ms-0.5" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground text-sm md:text-base truncate">
                          {t(lesson.title.ar, lesson.title.en)}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {lesson.duration}
                          </span>
                          {lesson.hasFiles && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileText className="w-3 h-3" />
                              {t('ملفات', 'Files')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      {lesson.isPreview ? (
                        <span className="badge-gold text-xs shrink-0 hidden sm:inline-flex">
                          {t('معاينة', 'Preview')}
                        </span>
                      ) : (
                        <span className="badge-stage text-xs shrink-0 hidden sm:inline-flex">
                          <Lock className="w-3 h-3 me-1" />
                          {t('مقفل', 'Locked')}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SubjectDetail;
