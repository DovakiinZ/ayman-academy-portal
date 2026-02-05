import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useLessonProgress } from '@/hooks/useLessonProgress';
import { Lesson, Subject, LessonContentItem } from '@/types/database';
import { Loader2, ChevronRight, ChevronLeft, FileText, Download, CheckCircle, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LessonNotes from '@/components/student/LessonNotes';
import LessonComments from '@/components/student/LessonComments';
import RatingWidget from '@/components/student/RatingWidget';
import CourseContentSidebar from '@/components/student/CourseContentSidebar';
import QuizPlayer from './QuizPlayer';

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
}

export default function LessonPlayer() {
    const { id } = useParams();
    const { t, direction } = useLanguage();
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
                content_items:lesson_content_items(*)
            `)
            .eq('id', id!)
            .eq('is_published', true)
            .single();

        if (error || !lessonData) {
            console.error('Error fetching lesson:', error);
            setLoading(false);
            return;
        }

        const typedLesson = lessonData as unknown as LessonWithDetails;
        setLesson(typedLesson);

        // Find video content
        // For now, assume video is in content_items or video_url field
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
            setQuizId(quizData.id);
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
                    {/* Video Container */}
                    <div className="w-full bg-black aspect-video lg:max-h-[70vh] flex items-center justify-center shrink-0">
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
                            <div className="text-white text-center p-4">
                                <p>{t('لا يوجد فيديو لهذا الدرس', 'No video for this lesson')}</p>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-border sticky top-0 bg-background z-10 px-4">
                        <div className="flex gap-6 overflow-x-auto">
                            {['overview', 'quiz', 'qa', 'notes', 'reviews'].map((tab) => {
                                if (tab === 'quiz' && !quizId) return null;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {tab === 'overview' && t('نظرة عامة', 'Overview')}
                                        {tab === 'quiz' && (
                                            <div className="flex items-center gap-1.5">
                                                <span>{t('الاختبار', 'Quiz')}</span>
                                                {!isCompleted && <span className="text-[10px] bg-secondary px-1.5 rounded text-muted-foreground">{t('مغلق', 'Locked')}</span>}
                                            </div>
                                        )}
                                        {tab === 'qa' && t('الأسئلة والنقاش', 'Q&A')}
                                        {tab === 'notes' && t('ملاحظاتي', 'Notes')}
                                        {tab === 'reviews' && t('التقييمات', 'Reviews')}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 lg:p-8 max-w-4xl">
                        {activeTab === 'overview' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h2 className="text-2xl font-bold mb-4">{t('حول هذا الدرس', 'About this lesson')}</h2>
                                    <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                                        <p className="whitespace-pre-wrap">
                                            {t(lesson.summary_ar || '', lesson.summary_en || lesson.summary_ar || '')}
                                        </p>
                                    </div>
                                </div>

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

                                {/* Resources */}
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
