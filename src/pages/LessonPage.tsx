import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, FileText, Download, CheckCircle, Clock, Lock, Loader2, Play, Link as LinkIcon, ArrowRight, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const LessonPage = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { t, direction } = useLanguage();
  const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;

  const [lesson, setLesson] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLessonData = async () => {
      if (!lessonId) return;
      setLoading(true);
      setError(null);

      try {
        // Fetch lesson
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .select('*, subject:subjects(*, stage:stages(*))')
          .eq('id', lessonId)
          .single();

        if (lessonError || !lessonData) {
          console.error('Lesson fetch error:', lessonError);
          setError(lessonError?.message || 'Lesson not found');
          return;
        }

        setLesson(lessonData);

        // Fetch sections and blocks
        const { data: sectionsData } = await supabase
          .from('lesson_sections')
          .select('*')
          .eq('lesson_id', lessonId)
          .order('order_index', { ascending: true });

        setSections(sectionsData || []);

        const { data: blocksData } = await supabase
          .from('lesson_blocks')
          .select('*')
          .eq('lesson_id', lessonId)
          .eq('is_published', true)
          .order('order_index', { ascending: true });

        setBlocks(blocksData || []);

        // Fetch legacy content items (blocks)
        const { data: itemsData, error: itemsError } = await supabase
          .from('lesson_content_items')
          .select('*')
          .eq('lesson_id', lessonId)
          .eq('is_published', true)
          .order('order_index', { ascending: true });

        if (itemsError) {
          console.error('Content items fetch error:', itemsError);
        } else {
          setContentItems(itemsData || []);
        }

        // Fetch quiz info
        const { data: quizData } = await supabase
          .from('lesson_quizzes')
          .select('id')
          .eq('lesson_id', lessonId)
          .eq('is_enabled', true)
          .single() as any;

        if (quizData) {
          setQuizId(quizData.id);
        }
      } catch (err: any) {
        console.error('Unexpected error:', err);
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchLessonData();
  }, [lessonId]);

  if (loading) {
    return (
      <Layout>
        <div className="container-academic py-20 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !lesson) {
    return (
      <Layout>
        <div className="container-academic py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('الدرس غير موجود', 'Lesson Not Found')}</h1>
          <Link to="/" className="text-primary hover:underline">
            {t('العودة للرئيسية', 'Back to Home')}
          </Link>
        </div>
      </Layout>
    );
  }

  // Video logic: Priority: Block > full_video_url > video_url > ContentItem
  let videoUrl = '';
  const videoBlock = blocks.find(b => b.type === 'video');
  const legacyVideoItem = contentItems.find(item => item.type === 'video');

  if (videoBlock?.url) {
    videoUrl = videoBlock.url;
  } else if (lesson?.full_video_url) {
    videoUrl = lesson.full_video_url;
  } else if (lesson?.video_url) {
    videoUrl = lesson.video_url;
  } else if (legacyVideoItem?.url) {
    videoUrl = legacyVideoItem.url;
  }

  const otherItems = contentItems.filter(item => item.type !== 'video');

  const getYoutubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)/);
    return (match && match[1].length === 11) ? match[1] : null;
  };

  const ytId = videoUrl ? getYoutubeId(videoUrl) : null;

  return (
    <Layout>
      {/* Theater Mode Header */}
      <section className="bg-[#0f1014] border-b border-white/5 relative overflow-hidden">
        {/* Subtle decorative background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

        <div className="container-academic relative z-10">
          {/* Breadcrumbs / Back navigation */}
          <div className="py-4 flex items-center justify-between">
            <Link
              to={`/stages/${lesson.subject?.stage?.slug}/${lesson.subject_id}`}
              className="inline-flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white transition-colors group"
            >
              <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <BackIcon className="w-3.5 h-3.5" />
              </div>
              {t('العودة للمادة', 'Back to Subject')}
            </Link>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-[10px] border-white/10 text-white/50 bg-white/5">
                {t(lesson.subject?.stage?.title_ar, lesson.subject?.stage?.title_en)}
              </Badge>
              <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5">
                {t(lesson.subject?.title_ar, lesson.subject?.title_en)}
              </Badge>
            </div>
          </div>

          {/* Main Player Area */}
          <div className="max-w-5xl mx-auto pb-10">
            <div className="relative group shadow-2xl shadow-black/50 rounded-xl overflow-hidden bg-black aspect-video border border-white/5">
              {ytId ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0`}
                  title={lesson.title_ar}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : videoUrl ? (
                <video
                  controls
                  className="w-full h-full"
                  src={videoUrl}
                >
                  {t('متصفحك لا يدعم تشغيل الفيديو', 'Your browser does not support video playback')}
                </video>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                  <Play className="w-16 h-16 mb-4 opacity-10" />
                  <p className="text-sm font-light">{t('لا يوجد فيديو لهذا الدرس', 'No video available for this lesson')}</p>
                </div>
              )}
            </div>
          </div>
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
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <span>{t(lesson.subject?.stage?.title_ar, lesson.subject?.stage?.title_en)}</span>
                  <span>·</span>
                  <span className="text-primary">{t(lesson.subject?.title_ar, lesson.subject?.title_en)}</span>
                </div>
                <h1 className="text-xl md:text-2xl font-medium text-foreground mb-3">
                  {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {lesson.duration_seconds && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {Math.floor(lesson.duration_seconds / 60)}:{String(lesson.duration_seconds % 60).padStart(2, '0')}
                    </span>
                  )}
                  {lesson.is_free_preview && (
                    <span className="badge-gold">
                      {t('معاينة مجانية', 'Free Preview')}
                    </span>
                  )}
                </div>
              </div>

              {/* Summary */}
              {lesson.summary_ar && (
                <div>
                  <h2 className="text-base font-medium text-foreground mb-2">
                    {t('نظرة عامة', 'Overview')}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t(lesson.summary_ar, lesson.summary_en || lesson.summary_ar)}
                  </p>
                </div>
              )}

              {/* Modern Sections & Blocks */}
              <div className="space-y-12">
                {sections.length > 0 ? (
                  sections.map(section => (
                    <div key={section.id} className="space-y-8">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-foreground shrink-0">
                          {t(section.title_ar, section.title_en || section.title_ar)}
                        </h3>
                        <div className="h-[1px] bg-border flex-1" />
                      </div>
                      <div className="space-y-6">
                        {blocks
                          .filter(b => b.section_id === section.id && (b.type !== 'video' || b.url !== videoUrl))
                          .map(block => (
                            <RenderBlock key={block.id} block={block} t={t} />
                          ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-6">
                    {blocks
                      .filter(b => !b.section_id && (b.type !== 'video' || b.url !== videoUrl))
                      .map(block => (
                        <RenderBlock key={block.id} block={block} t={t} />
                      ))}
                  </div>
                )}
              </div>

              {/* Blocks / Content Items (Legacy) */}
              <div className="space-y-6">
                {otherItems.map((item) => (
                  <div key={item.id} className="prose prose-sm max-w-none">
                    {item.type === 'article' && (
                      <div className="bg-secondary/20 p-4 rounded-lg">
                        <h3 className="text-base font-medium mb-2">{t(item.title_ar, item.title_en || item.title_ar)}</h3>
                        <div className="text-muted-foreground whitespace-pre-wrap">
                          {t(item.body_ar, item.body_en || item.body_ar)}
                        </div>
                      </div>
                    )}
                    {item.type === 'image' && (
                      <div className="space-y-2">
                        <img src={item.url} alt={item.title_ar} className="rounded-lg w-full object-cover max-h-96" />
                        {item.title_ar && <p className="text-xs text-center text-muted-foreground">{t(item.title_ar, item.title_en)}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Files */}
              <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="p-4 bg-secondary/30 border-b border-border">
                  <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-primary" strokeWidth={2} />
                    {t('ملفات الدرس', 'Lesson Materials')}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {contentItems.filter(i => i.type === 'file').length === 0 &&
                    blocks.filter(i => i.type === 'file').length === 0 ? (
                    <div className="text-center py-6">
                      <Download className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-[10px] text-muted-foreground">
                        {t('لا توجد ملفات مرفقة لهذا الدرس', 'No materials attached')}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Combine legacy and modern files */}
                      {[...contentItems.filter(i => i.type === 'file'), ...blocks.filter(i => i.type === 'file')].map((file) => (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-secondary/20 hover:bg-secondary/40 rounded-lg transition-colors group"
                        >
                          <div className="w-8 h-8 rounded bg-background flex items-center justify-center border border-border">
                            <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate">
                              {t(file.title_ar, file.title_en || file.title_ar)}
                            </p>
                            <p className="text-[9px] text-muted-foreground uppercase">
                              {file.url?.split('.').pop() || 'file'}
                            </p>
                          </div>
                        </a>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Quiz CTA */}
              {quizId && (
                <div className="bg-primary/5 rounded-xl border border-primary/20 overflow-hidden relative">
                  <div className="p-5 relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <BrainCircuit className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="font-bold text-foreground text-sm">
                        {t('اختبار متاح', 'Quiz Available')}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      {t(
                        'اختبر فهمك لمحتوى هذا الدرس من خلال هذا الاختبار القصير.',
                        'Test your understanding of this lesson with a short quiz.'
                      )}
                    </p>
                    <Link to={`/student/lesson/${lesson.id}`}>
                      <Button className="w-full shadow-lg hover:shadow-primary/20 transition-all font-bold gap-2" variant="default" size="sm">
                        {t('بدء الاختبار', 'Start Quiz')}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Enhanced Subscription CTA */}
              {lesson.is_paid && !lesson.is_free_preview && (
                <div className="bg-primary/5 rounded-xl border border-primary/10 overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-2 opacity-5">
                    <Lock className="w-16 h-16 text-primary rotate-12" strokeWidth={1} />
                  </div>
                  <div className="p-5 relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="font-bold text-foreground text-sm">
                        {t('افتح كامل المحتوى', 'Unlock Full Access')}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      {t(
                        'هذا الدرس جزء من الباقة التعليمية المدفوعة. اشترك الآن للوصول إلى كافة الدروس والملفات المرفقة بجودة عالية.',
                        'This lesson is part of a premium package. Subscribe today to get full access to all materials and support.'
                      )}
                    </p>
                    <Link to="/plans">
                      <Button className="w-full shadow-lg hover:shadow-primary/20 transition-all font-bold gap-2" size="sm">
                        {t('تصفح الباقات', 'View Subscription Plans')}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Progress Tracking Placeholder for Guests */}
              <div className="p-5 bg-card rounded-xl border border-border border-dashed text-center">
                <Clock className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <h4 className="text-[11px] font-bold text-muted-foreground mb-1">
                  {t('حفظ تقدمك', 'Track Your Progress')}
                </h4>
                <p className="text-[10px] text-muted-foreground/60">
                  {t('قم بتسجيل الدخول لحفظ تقدمك في الدرس', 'Sign in to save where you left off')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default LessonPage;

function RenderBlock({ block, t }: { block: any, t: any }) {
  const getYoutubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)/);
    return (match && match[1].length === 11) ? match[1] : null;
  };

  switch (block.type) {
    case 'rich_text':
      return (
        <div className="prose dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
        </div>
      );
    case 'tip':
    case 'warning':
    case 'example':
    case 'exercise': {
      const styles: any = {
        tip: 'bg-blue-50 dark:bg-blue-950/30 border-s-4 border-blue-500',
        warning: 'bg-yellow-50 dark:bg-yellow-950/30 border-s-4 border-yellow-500',
        example: 'bg-emerald-50 dark:bg-emerald-950/30 border-s-4 border-emerald-500',
        exercise: 'bg-orange-50 dark:bg-orange-950/30 border-s-4 border-orange-500',
      };
      const labels: any = {
        tip: { ar: 'نصيحة', en: 'Tip' },
        warning: { ar: 'تنبيه', en: 'Warning' },
        example: { ar: 'مثال', en: 'Example' },
        exercise: { ar: 'تمرين', en: 'Exercise' },
      };
      return (
        <div className={cn("p-4 rounded-e-md", styles[block.type])}>
          <p className="font-bold text-xs mb-1 opacity-80">{t(labels[block.type].ar, labels[block.type].en)}</p>
          <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
        </div>
      );
    }
    case 'image':
      return block.url ? (
        <div className="space-y-2">
          <img src={block.url} alt="" className="rounded-lg w-full object-cover max-h-[500px] shadow-sm" />
          {(block.title_ar || block.title_en) && (
            <p className="text-xs text-center text-muted-foreground italic">
              {t(block.title_ar || '', block.title_en || '')}
            </p>
          )}
        </div>
      ) : null;
    case 'video': {
      const ytId = block.url ? getYoutubeId(block.url) : null;
      if (ytId) {
        return (
          <div className="space-y-2">
            {(block.title_ar || block.title_en) && <h4 className="text-sm font-medium">{t(block.title_ar || '', block.title_en || '')}</h4>}
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-sm">
              <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${ytId}`} frameBorder="0" allowFullScreen />
            </div>
          </div>
        );
      }
      return block.url ? <video controls src={block.url} className="w-full rounded-lg shadow-sm" /> : null;
    }
    case 'file':
      return (
        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <Download className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{t(block.title_ar || 'ملف', block.title_en || 'File')}</p>
              <p className="text-[10px] text-muted-foreground">{t('ملف مرفق', 'Attached material')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={block.url} target="_blank" rel="noopener noreferrer">{t('تحميل', 'Download')}</a>
          </Button>
        </div>
      );
    case 'link':
      return (
        <a href={block.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group">
          <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <LinkIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{t(block.title_ar || block.url, block.title_en || block.url)}</p>
            {block.content_ar && <p className="text-[10px] text-muted-foreground truncate">{t(block.content_ar, block.content_en || block.content_ar)}</p>}
          </div>
        </a>
      );
    case 'equation':
      return (
        <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-lg p-6 text-center shadow-inner">
          <div className="text-lg font-mono tracking-wider overflow-x-auto py-2">
            {t(block.content_ar || '', block.content_en || block.content_ar || '')}
          </div>
          {(block.title_ar || block.title_en) && (
            <p className="text-[10px] text-muted-foreground mt-2">{t(block.title_ar || '', block.title_en || '')}</p>
          )}
        </div>
      );
    case 'qa':
      return (
        <div className="space-y-3 bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex gap-2">
            <Badge variant="outline" className="h-5 px-1 bg-primary/5 text-primary border-primary/20">Q</Badge>
            <p className="text-sm font-semibold">{t(block.title_ar || '', block.title_en || '')}</p>
          </div>
          <div className="flex gap-2 border-t border-border pt-3">
            <Badge variant="outline" className="h-5 px-1 bg-emerald-50 text-emerald-600 border-emerald-200">A</Badge>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap italic">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
          </div>
        </div>
      );
    default:
      return null;
  }
}
