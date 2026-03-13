import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { ChevronLeft, ChevronRight, FileText, Download, CheckCircle, Clock, Lock, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLesson } from '@/hooks/useQueryHooks';
import { LessonBlock, LessonSection } from '@/types/database';

// Helper to extract YouTube ID
const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const LessonPage = () => {
  const { lessonId } = useParams();
  const { t, direction } = useLanguage();
  const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;

  const { data: currentLessonData, isLoading: loading, error } = useLesson(lessonId);
  const lesson = currentLessonData?.lesson || null;

  if (loading) {
      return (
          <Layout>
              <div className="h-[60vh] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse text-sm">
                      {t('جاري تحميل الدرس...', 'Loading lesson...')}
                    </p>
                  </div>
              </div>
          </Layout>
      );
  }

  if (error || !lesson) {
      return (
          <Layout>
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {t('تعذر الوصول للدرس', 'Access Denied or Not Found')}
                  </h2>
                  <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                    {error 
                      ? t('حدث خطأ في النظام أثناء جلب البيانات', 'A system error occurred while fetching data')
                      : t('هذا الدرس غير متاح حالياً للمعاينة العامة أو غير موجود', 'This lesson is not available for public preview or does not exist')}
                  </p>
                  <Button variant="outline" onClick={() => window.history.back()}>
                    {t('العودة للخلف', 'Go Back')}
                  </Button>
              </div>
          </Layout>
      );
  }

  const duration = lesson.duration_seconds
      ? `${Math.floor(lesson.duration_seconds / 60)}:${(lesson.duration_seconds % 60).toString().padStart(2, '0')}`
      : '10:00';

  const publishedBlocks = lesson.blocks?.filter((b: LessonBlock) => b.is_published !== false) || [];
  const resources = publishedBlocks.filter((b: LessonBlock) => ['file', 'link'].includes(b.type)) || [];
  
  const currentVideoUrl = lesson.video_url || lesson.full_video_url || lesson.preview_video_url || null;
  const youtubeId = currentVideoUrl ? getYoutubeId(currentVideoUrl) : null;
  const isPreview = !!lesson.preview_video_url;

  return (
    <Layout>
      {/* Video Section */}
      <section className="bg-foreground">
        <div className="container-academic py-3">
          <Link
            to={`/stages/${lesson.subject?.stage_id || lesson.subject?.level_id}/${lesson.subject_id}`}
            className="inline-flex items-center gap-1 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <BackIcon className="w-4 h-4" />
            {t('العودة للمادة', 'Back to Subject')}
          </Link>
        </div>
        <div className="aspect-video lg:max-h-[70vh] bg-black flex items-center justify-center shrink-0 border-y border-border">
          {youtubeId ? (
              <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1`}
                  title="Video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
              ></iframe>
          ) : (
            <div className="text-center text-muted-foreground p-8">
                <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('الفيديو غير متاح', 'Video not available')}</p>
            </div>
          )}
        </div>
      </section>

      {/* Lesson Content */}
      <section className="section-academic">
        <div className="container-academic">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title & Meta */}
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <span>{t(lesson.subject?.stage?.title_ar, lesson.subject?.stage?.title_en)}</span>
                  <span>·</span>
                  <span className="text-primary">{t(lesson.subject?.title_ar, lesson.subject?.title_en)}</span>
                  <span>·</span>
                  <span>{lesson.teacher?.full_name || t('المعلم', 'Teacher')}</span>
                </div>
                <h1 className="text-xl md:text-2xl font-medium text-foreground mb-3">
                  {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {duration}
                  </span>
                  {isPreview && (
                    <span className="badge-gold">
                      {t('معاينة مجانية', 'Free Preview')}
                    </span>
                  )}
                </div>
              </div>

              {/* Overview */}
              <div>
                <h2 className="text-base font-medium text-foreground mb-2">
                  {t('نظرة عامة', 'Overview')}
                </h2>
                <div className="prose dark:prose-invert max-w-none text-muted-foreground text-sm">
                  <p className="whitespace-pre-wrap">
                      {t(lesson.summary_ar || '', lesson.summary_en || lesson.summary_ar || '')}
                  </p>
                </div>
              </div>

              {/* Objectives (If using old objectives column or block) */}
              {(lesson.objectives_ar || lesson.objectives_en) && (
                <div>
                  <h2 className="text-base font-medium text-foreground mb-2">
                    {t('أهداف الدرس', 'Lesson Objectives')}
                  </h2>
                  <div className="prose dark:prose-invert max-w-none text-muted-foreground text-sm">
                      <p className="whitespace-pre-wrap">
                          {t(lesson.objectives_ar || '', lesson.objectives_en || '')}
                      </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Files */}
              {resources.length > 0 && (
                <div className="academic-card">
                  <h3 className="font-medium text-foreground mb-3 flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4" strokeWidth={1.5} />
                    {t('مرفقات الدرس', 'Lesson Resources')}
                  </h3>
                  <div className="space-y-2">
                    {resources.map((res: LessonBlock) => (
                      <a
                        key={res.id}
                        href={res.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 bg-secondary/50 rounded hover:bg-secondary/80 transition-colors"
                      >
                        <div className="flex items-center gap-2 overflow-hidden truncate">
                          {res.type === 'file' ? (
                              <Download className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                          )}
                          <p className="text-sm text-foreground truncate">
                            {t(res.title_ar, res.title_en || res.title_ar)}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Subscription CTA */}
              <div className="academic-card bg-secondary/40">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <h3 className="font-medium text-foreground text-sm">
                    {t('هذا المحتوى مخصص للمشتركين', 'Subscriber Content')}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {t(
                    'اشترك للحصول على جميع الدروس والمواد التعليمية',
                    'Subscribe to access all lessons and educational materials'
                  )}
                </p>
                <Link to="/plans">
                  <Button className="w-full" size="sm">
                    {t('طلب اشتراك', 'Request Subscription')}
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
