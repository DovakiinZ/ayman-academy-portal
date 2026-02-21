import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';
import { Play, Lock, Clock, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const SubjectDetail = () => {
  const { slug, subjectId } = useParams<{ slug: string; subjectId: string }>();
  const { t, direction } = useLanguage();
  const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;

  const [subject, setSubject] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubjectData = async () => {
      if (!subjectId) return;
      setLoading(true);
      setError(null);

      try {
        // Fetch subject
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('*, stage:stages(*)')
          .eq('id', subjectId)
          .single();

        if (subjectError || !subjectData) {
          console.error('Subject fetch error:', subjectError);
          setError(subjectError?.message || 'Subject not found');
          return;
        }

        setSubject(subjectData);

        // Fetch lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('subject_id', subjectId)
          .eq('is_published', true)
          .order('order_index', { ascending: true });

        if (lessonsError) {
          console.error('Lessons fetch error:', lessonsError);
        } else {
          setLessons(lessonsData || []);
        }
      } catch (err: any) {
        console.error('Unexpected error:', err);
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectData();
  }, [subjectId]);

  if (loading) {
    return (
      <Layout>
        <div className="container-academic py-20 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !subject) {
    return (
      <Layout>
        <div className="container-academic py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('المادة غير موجودة', 'Subject Not Found')}</h1>
          <Link to={`/stages/${slug}`} className="text-primary hover:underline">
            {t('العودة للمرحلة', 'Back to stage')}
          </Link>
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
            to={`/stages/${slug}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <BackIcon className="w-4 h-4" />
            {t(subject.stage?.title_ar, subject.stage?.title_en || subject.stage?.title_ar)}
          </Link>
          <h1 className="text-foreground mb-2">
            {t(subject.title_ar, subject.title_en || subject.title_ar)}
          </h1>
          <p className="text-muted-foreground">
            {t(subject.stage?.title_ar, subject.stage?.title_en || subject.stage?.title_ar)}
          </p>
        </div>
      </section>

      {/* Lessons List */}
      <section className="section-academic">
        <div className="container-academic">
          {lessons.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {t('لا توجد دروس متوفرة حالياً لهذه المادة', 'No lessons available for this subject yet')}
            </div>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  to={lesson.is_free_preview || !lesson.is_paid ? `/lesson/${lesson.id}` : '#'}
                  className={`academic-card py-4 flex items-center gap-4 ${lesson.is_paid && !lesson.is_free_preview ? 'lesson-locked cursor-default' : 'hover:shadow-md'
                    } transition-all group`}
                >
                  {/* Play/Lock Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!lesson.is_paid || lesson.is_free_preview
                        ? 'bg-primary/10 text-primary group-hover:bg-primary/15'
                        : 'bg-muted text-muted-foreground'
                      } transition-colors`}
                  >
                    {!lesson.is_paid || lesson.is_free_preview ? (
                      <Play className="w-4 h-4 ms-0.5" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-sm md:text-base truncate">
                      {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      {lesson.duration_seconds && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {Math.floor(lesson.duration_seconds / 60)}:{String(lesson.duration_seconds % 60).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  {lesson.is_free_preview ? (
                    <span className="badge-gold text-xs shrink-0 hidden sm:inline-flex">
                      {t('معاينة', 'Preview')}
                    </span>
                  ) : lesson.is_paid ? (
                    <span className="badge-stage text-xs shrink-0 hidden sm:inline-flex">
                      <Lock className="w-3 h-3 me-1" />
                      {t('مقفل', 'Locked')}
                    </span>
                  ) : (
                    <span className="badge-gold text-xs shrink-0 hidden sm:inline-flex">
                      {t('مجاني', 'Free')}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default SubjectDetail;
