import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { Play, Lock, Clock, FileText, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useLessons } from '@/hooks/useQueryHooks';
import { useAuth } from '@/contexts/AuthContext';

const SubjectDetail = () => {
  const { stageId, subjectId } = useParams<{ stageId: string; subjectId: string }>();
  const { t, direction } = useLanguage();
  const { user } = useAuth();
  const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;

  const { data, isLoading, error } = useLessons(subjectId, user?.id);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">{t('فشل تحميل البيانات', 'Failed to load data')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('المادة المطلوبة غير موجودة أو حدث خطأ في النظام', 'The requested subject does not exist or a system error occurred')}
          </p>
          <Link
            to={`/stages/${stageId}`}
            className="flex items-center gap-2 hover:text-primary transition-colors font-medium"
          >
            <BackIcon className="w-4 h-4" />
            {t('العودة للمرحلة', 'Back to Stage')}
          </Link>
        </div>
      </Layout>
    );
  }

  const { subject, lessons } = (data as { subject: any; lessons: any[] });

  const subjectTitle = {
    ar: subject?.title_ar || '',
    en: subject?.title_en || subject?.title_ar || ''
  };

  const stageTitle = {
    ar: subject?.stage?.title_ar || '',
    en: subject?.stage?.title_en || subject?.stage?.title_ar || ''
  };

  // Group lessons by a virtual unit since we don't have units in DB yet
  // If we ever add grouping, we should update this logic
  const groupedLessons = lessons.length > 0 ? [
    {
      id: 'default',
      unit: { ar: t('الدروس', 'Lessons'), en: t('الدروس', 'Lessons') },
      lessons: lessons.map((l: any) => ({
        id: l.id,
        title: { ar: l.title_ar, en: l.title_en || l.title_ar },
        duration: l.duration_seconds
          ? `${Math.floor(l.duration_seconds / 60)}:${(l.duration_seconds % 60).toString().padStart(2, '0')}`
          : l.duration_minutes ? `${l.duration_minutes}:00` : '--:--',
        isPreview: !l.is_paid || l.is_free_preview,
        hasFiles: !!(l.content_items && l.content_items.length > 0)
      }))
    }
  ] : [];

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
            {t(stageTitle.ar, stageTitle.en)}
          </Link>
          <h1 className="text-foreground mb-2">
            {t(subjectTitle.ar, subjectTitle.en)}
          </h1>
          <p className="text-muted-foreground">
            {t(stageTitle.ar, stageTitle.en)}
          </p>
        </div>
      </section>

      {/* Lessons List */}
      <section className="section-academic">
        <div className="container-academic">
          <div className="space-y-8">
            {groupedLessons.length === 0 ? (
              <div className="text-center py-12 bg-secondary/10 rounded-xl border border-dashed border-border">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t('لا توجد دروس متاحة حالياً', 'No lessons available yet')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('يرجى العودة لاحقاً لمتابعة المحتوى الجديد', 'Please check back later for new content')}
                </p>
              </div>
            ) : (
              groupedLessons.map((unit: any) => (
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
            ))
          )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SubjectDetail;
