import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/lib/supabase';
import { useLessonProgress } from '@/hooks/useLessonProgress';
import { Lesson, Subject, LessonContentItem, LessonSection, LessonBlock } from '@/types/database';
import { Loader2, ChevronRight, ChevronLeft, FileText, Download, CheckCircle, BrainCircuit, Video as VideoIcon, Image as ImageIcon, Lightbulb, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LessonNotes from '@/components/student/LessonNotes';
import LessonComments from '@/components/student/LessonComments';
import RatingWidget from '@/components/student/RatingWidget';
import CourseContentSidebar from '@/components/student/CourseContentSidebar';
import QuizPlayer from './QuizPlayer';
import { cn } from '@/lib/utils';

// Helper to extract YouTube ID
const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

interface LessonWithDetails extends Lesson {
    subject: Subject;
    content_items: LessonContentItem[];
    sections: LessonSection[];
    blocks: LessonBlock[];
}

export default function LessonPlayer() {
    const { id } = useParams();
    const { t, direction } = useLanguage();
    const { settings } = useSettings();
    const { profile } = useAuth();
    const navigate = useNavigate();

    const [lesson, setLesson] = useState<LessonWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [activeTab, setActiveTab] = useState('overview');
    const [quizId, setQuizId] = useState<string | null>(null);

    // Use the custom hook for progress
    const { progress, updateProgress, isCompleted } = useLessonProgress(id || '');

    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (id && profile?.id) {
            fetchLesson();
        }
        return () => stopTracking();
    }, [id, profile?.id]);

    // Restore last position when progress loads
    useEffect(() => {
        if (progress?.last_position_seconds && currentTime === 0) {
            setCurrentTime(progress.last_position_seconds);
        }
    }, [progress]);

    const fetchLesson = async () => {
        setLoading(true);

        const { data: lessonData, error } = await supabase
            .from('lessons')
            .select(`
                *,
                subject:subjects(*),
                content_items:lesson_content_items(*),
                sections:lesson_sections(*),
                blocks:lesson_blocks(*)
            `)
            .eq('id', id!)
            .eq('is_published', true)
            .single();

        if (error || !lessonData) {
            console.error('Error fetching lesson:', error);
            setLoading(false);
            return;
        }

        const data = lessonData as any;
        const sortedSections = (data.sections || []).sort((a: any, b: any) => a.order_index - b.order_index);
        const sortedBlocks = (data.blocks || []).sort((a: any, b: any) => a.order_index - b.order_index);

        const typedLesson = {
            ...data,
            sections: sortedSections,
            blocks: sortedBlocks
        } as unknown as LessonWithDetails;

        setLesson(typedLesson);

        // Find video content - prioritize blocks video? or keep legacy?
        // Let's keep legacy top video for now if exists, otherwise check blocks?
        // Actually, if there are blocks, we probably render them in the content area
        if (typedLesson.video_url) {
            setCurrentVideoUrl(typedLesson.video_url);
        } else if (typedLesson.full_video_url) {
            setCurrentVideoUrl(typedLesson.full_video_url);
        } else if (typedLesson.preview_video_url) {
            setCurrentVideoUrl(typedLesson.preview_video_url);
        }

        // Check for quiz
        const { data: quizData } = await supabase
            .from('lesson_quizzes')
            .select('id')
            .eq('lesson_id', id!)
            .single();

        if (quizData) {
            setQuizId((quizData as unknown as { id: string }).id);
        }

        startTracking();
        setLoading(false);
    };

    const startTracking = () => {
        stopTracking();
        progressIntervalRef.current = setInterval(handleProgressTick, 5000); // Update every 5s
    };

    const stopTracking = () => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }
    };

    const handleProgressTick = () => {
        if (!lesson) return;

        // Mock duration logic (assume 10 mins if unknown)
        const duration = lesson.duration_seconds || 600;

        // Advance time in UI
        setCurrentTime(prev => {
            const nextTime = prev + 5;
            const percent = Math.min(100, Math.round((nextTime / duration) * 100));
            updateProgress(percent, nextTime);
            return nextTime;
        });
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    if (!lesson) return <div className="p-8 text-center">{t('الدرس غير موجود', 'Lesson not found')}</div>;

    const youtubeId = currentVideoUrl ? getYoutubeId(currentVideoUrl) : null;
    const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;

    const resources = lesson.content_items?.filter(i => ['file', 'link'].includes(i.type)) || [];

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top Bar */}
            <div className="bg-background border-b border-border sticky top-0 z-20 px-4 h-14 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to={`/student/subjects/${lesson.subject_id}`}>
                        <div className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
                            <BackIcon className="w-5 h-5" />
                            <span className="text-sm font-medium ml-2 hidden sm:inline">{t('العودة', 'Back')}</span>
                        </div>
                    </Link>
                    <div className="h-6 w-px bg-border mx-2" />
                    <div>
                        <h1 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1">
                            {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                        </h1>
                    </div>
                </div>
                {/* Progress Indicator */}
                {progress?.completed_at && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        {t('مكتمل', 'Completed')}
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">
                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-y-auto bg-background">
                    {/* Video Container (Legacy or Hero Video) */}
                    {youtubeId && (
                        <div className="w-full bg-black aspect-video lg:max-h-[70vh] flex items-center justify-center shrink-0">
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
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="border-b border-border sticky top-0 bg-background z-10 px-4">
                        <div className="flex gap-6 overflow-x-auto">
                            {['overview', 'quiz', 'qa', 'notes', 'reviews'].map((tab) => {
                                if (tab === 'quiz' && !quizId) return null;
                                if (tab === 'qa' && settings['ui.enable_comments'] === false) return null;
                                if (tab === 'reviews' && settings['ui.enable_ratings'] === false) return null;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {tab === 'quiz' && (
                                            <div className="flex items-center gap-1.5">
                                                <span>{t('الاختبار', 'Quiz')}</span>
                                                {!isCompleted && <span className="text-[10px] bg-secondary px-1.5 rounded text-muted-foreground">{t('مغلق', 'Locked')}</span>}
                                            </div>
                                        )}
                                        {tab === 'qa' && settings['ui.enable_comments'] !== false && t('الأسئلة والنقاش', 'Q&A')}
                                        {tab === 'notes' && t('ملاحظاتي', 'Notes')}
                                        {tab === 'reviews' && settings['ui.enable_ratings'] !== false && t('التقييمات', 'Reviews')}
                                        {tab === 'overview' && t('الدرس', 'Lesson')}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
                        {activeTab === 'overview' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Blocks Content Renderer */}
                                {lesson.sections && lesson.sections.length > 0 ? (
                                    <LessonContentRenderer lesson={lesson} />
                                ) : (
                                    /* Legacy Description Fallback */
                                    <div>
                                        <h2 className="text-2xl font-bold mb-4">{t('حول هذا الدرس', 'About this lesson')}</h2>
                                        <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                                            <p className="whitespace-pre-wrap">
                                                {t(lesson.summary_ar || '', lesson.summary_en || lesson.summary_ar || '')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {quizId && (
                                    <div className="bg-secondary/20 border border-border rounded-lg p-6">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-full ${isCompleted ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                <BrainCircuit className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg mb-1">{t('اختبار الدرس', 'Lesson Quiz')}</h3>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    {isCompleted
                                                        ? t('يمكنك الآن إجراء الاختبار لتقييم فهمك للدرس.', 'You can now take the quiz to assess your understanding.')
                                                        : t('أكمل مشاهدة الدرس لفتح الاختبار.', 'Complete watching the lesson to unlock the quiz.')}
                                                </p>
                                                <Button
                                                    onClick={() => setActiveTab('quiz')}
                                                    disabled={!isCompleted}
                                                    variant={isCompleted ? 'default' : 'outline'}
                                                >
                                                    {t('بدء الاختبار', 'Start Quiz')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Resources (Legacy) */}
                                {resources.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            {t('المرفقات', 'Resources')}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {resources.map(res => (
                                                <a
                                                    key={res.id}
                                                    href={res.url || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center p-3 bg-secondary/10 border border-border rounded-md hover:border-primary transition-colors group"
                                                >
                                                    <Download className="w-4 h-4 text-primary shrink-0" />
                                                    <span className="mx-3 text-sm truncate">{t(res.title_ar, res.title_en || res.title_ar)}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'quiz' && quizId && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {isCompleted ? (
                                    <QuizPlayer quizId={quizId} lessonId={lesson.id} />
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                                        <BrainCircuit className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-medium mb-2">{t('الاختبار مغلق', 'Quiz Locked')}</h3>
                                        <p className="text-muted-foreground">{t('يجب إكمال 90% من الدرس لفتح الاختبار', 'You must complete 90% of the lesson to unlock the quiz')}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'qa' && <LessonComments lessonId={lesson.id} />}
                        {activeTab === 'notes' && <LessonNotes lessonId={lesson.id} currentTime={currentTime} />}
                        {activeTab === 'reviews' && <RatingWidget entityId={lesson.id} entityType="lesson" title={t('تقييم الدرس', 'Rate this Lesson')} />}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-full lg:w-96 border-l border-border bg-background lg:h-full overflow-hidden flex flex-col shrink-0">
                    <CourseContentSidebar
                        subjectId={lesson.subject_id}
                        currentLessonId={lesson.id}
                        userId={profile!.id}
                    />
                </div>
            </div>
        </div>
    );
}

function LessonContentRenderer({ lesson }: { lesson: LessonWithDetails }) {
    const { t } = useLanguage();

    // Group blocks by section (including null section)
    const blocksBySection: Record<string, LessonBlock[]> = {};
    const unsectionedBlocks: LessonBlock[] = [];

    lesson.blocks.forEach(block => {
        if (block.section_id) {
            if (!blocksBySection[block.section_id]) blocksBySection[block.section_id] = [];
            blocksBySection[block.section_id].push(block);
        } else {
            unsectionedBlocks.push(block);
        }
    });

    return (
        <div className="space-y-12">
            {/* Unsectioned Blocks */}
            {unsectionedBlocks.length > 0 && (
                <div className="space-y-6">
                    {unsectionedBlocks.map(block => (
                        <BlockDisplay key={block.id} block={block} />
                    ))}
                </div>
            )}

            {/* Sections */}
            {lesson.sections.map(section => (
                <div key={section.id} className="space-y-6">
                    <h2 className="text-xl font-bold border-b border-border pb-2">
                        {t(section.title_ar, section.title_en || section.title_ar)}
                    </h2>
                    <div className="space-y-6">
                        {(blocksBySection[section.id] || []).map(block => (
                            <BlockDisplay key={block.id} block={block} />
                        ))}
                        {(!blocksBySection[section.id] || blocksBySection[section.id].length === 0) && (
                            <p className="text-muted-foreground italic text-sm">{t('لا يوجد محتوى في هذا القسم', 'No content in this section')}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function BlockDisplay({ block }: { block: LessonBlock }) {
    const { t } = useLanguage();

    switch (block.type) {
        case 'rich_text':
            return (
                <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'tip':
            return (
                <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4 rounded-r-md">
                    <div className="flex items-center gap-2 mb-1 text-blue-600 font-semibold text-sm">
                        <Lightbulb className="w-4 h-4" />
                        {t('نصيحة', 'Tip')}
                    </div>
                    <p className="text-sm">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'warning':
            return (
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-500 p-4 rounded-r-md">
                    <div className="flex items-center gap-2 mb-1 text-yellow-600 font-semibold text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        {t('تنبيه', 'Warning')}
                    </div>
                    <p className="text-sm">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'video':
            // If it's a youtube link, embed it
            const localYoutubeId = block.url ? getYoutubeId(block.url) : null;
            if (localYoutubeId) {
                return (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${localYoutubeId}`}
                            title="Video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                        ></iframe>
                    </div>
                )
            }
            return (
                <a href={block.url} target="_blank" rel="noopener" className="block p-4 bg-secondary/20 rounded-lg flex items-center gap-3 hover:bg-secondary/40 transition-colors">
                    <VideoIcon className="w-6 h-6 text-primary" />
                    <span className="text-blue-500 underline">{block.url}</span>
                </a>
            );
        case 'image':
            return (
                <div className="rounded-lg overflow-hidden my-4">
                    <img src={block.url} alt="Lesson Content" className="max-w-full h-auto mx-auto rounded-lg shadow-sm" />
                </div>
            );
        default:
            return null;
    }
}
