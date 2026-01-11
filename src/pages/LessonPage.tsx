import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { ChevronLeft, ChevronRight, FileText, Download, CheckCircle, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LessonPage = () => {
  const { lessonId } = useParams();
  const { t, direction } = useLanguage();
  const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;

  // Mock lesson data
  const lesson = {
    id: lessonId,
    title: { ar: 'مقدمة في المادة', en: 'Introduction to the Subject' },
    subject: { ar: 'الرياضيات', en: 'Mathematics' },
    stage: { ar: 'المرحلة الابتدائية', en: 'Primary Stage' },
    duration: '12:30',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', // Sample video
    isPreview: true,
    objectives: [
      { ar: 'فهم الأساسيات الرئيسية للمادة', en: 'Understand the main fundamentals of the subject' },
      { ar: 'التعرف على المصطلحات الأساسية', en: 'Learn basic terminology' },
      { ar: 'تطبيق المفاهيم في تمارين بسيطة', en: 'Apply concepts in simple exercises' },
    ],
    files: [
      { name: { ar: 'ملخص الدرس.pdf', en: 'Lesson Summary.pdf' }, size: '2.4 MB' },
      { name: { ar: 'تمارين الوحدة.pdf', en: 'Unit Exercises.pdf' }, size: '1.8 MB' },
    ],
    overview: {
      ar: 'في هذا الدرس، سنتعرف على المفاهيم الأساسية التي تشكل حجر الأساس للمادة. سنبدأ بشرح المصطلحات الرئيسية ثم ننتقل إلى فهم العلاقات بين المفاهيم المختلفة. هذا الدرس مصمم ليكون مقدمة شاملة تمهد الطريق للدروس اللاحقة.',
      en: 'In this lesson, we will explore the fundamental concepts that form the cornerstone of the subject. We will begin by explaining key terminology and then move on to understanding the relationships between different concepts. This lesson is designed to be a comprehensive introduction that paves the way for subsequent lessons.',
    },
  };

  return (
    <Layout>
      {/* Video Section */}
      <section className="bg-foreground">
        <div className="container-academic py-4">
          <Link
            to="/stages/primary/math-primary"
            className="inline-flex items-center gap-1 text-sm text-primary-foreground/70 hover:text-primary-foreground mb-4 transition-colors"
          >
            <BackIcon className="w-4 h-4" />
            {t('العودة للمادة', 'Back to Subject')}
          </Link>
        </div>
        <div className="aspect-video max-h-[500px] bg-black">
          <video
            controls
            className="w-full h-full"
            poster="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1920&h=1080&fit=crop"
          >
            <source src={lesson.videoUrl} type="video/mp4" />
            {t('متصفحك لا يدعم تشغيل الفيديو', 'Your browser does not support video playback')}
          </video>
        </div>
      </section>

      {/* Lesson Content */}
      <section className="section-academic">
        <div className="container-academic">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title & Meta */}
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <span>{t(lesson.stage.ar, lesson.stage.en)}</span>
                  <span>•</span>
                  <span className="text-primary">{t(lesson.subject.ar, lesson.subject.en)}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
                  {t(lesson.title.ar, lesson.title.en)}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {lesson.duration}
                  </span>
                  {lesson.isPreview && (
                    <span className="badge-gold">
                      {t('معاينة مجانية', 'Free Preview')}
                    </span>
                  )}
                </div>
              </div>

              {/* Overview */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  {t('نظرة عامة', 'Overview')}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t(lesson.overview.ar, lesson.overview.en)}
                </p>
              </div>

              {/* Objectives */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  {t('أهداف الدرس', 'Lesson Objectives')}
                </h2>
                <ul className="space-y-2">
                  {lesson.objectives.map((objective, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">
                        {t(objective.ar, objective.en)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Files */}
              <div className="academic-card">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t('ملفات الدرس', 'Lesson Files')}
                </h3>
                <div className="space-y-3">
                  {lesson.files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-md"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {t(file.name.ar, file.name.en)}
                        </p>
                        <p className="text-xs text-muted-foreground">{file.size}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subscription CTA */}
              <div className="academic-card bg-secondary/50">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">
                    {t('الوصول الكامل', 'Full Access')}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t(
                    'اشترك للحصول على جميع الدروس والمواد التعليمية',
                    'Subscribe to access all lessons and educational materials'
                  )}
                </p>
                <Link to="/plans">
                  <Button className="w-full">
                    {t('استعرض الباقات', 'View Plans')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default LessonPage;
