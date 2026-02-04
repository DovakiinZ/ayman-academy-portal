import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTemplate } from '@/hooks/useTemplate';
import { supabase } from '@/lib/supabase';
import { Lesson, Course, LessonResource, LessonProgress, Profile } from '@/types/database';
import { Loader2, ChevronRight, ChevronLeft, FileText, Download, CheckCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LessonNotes from '@/components/student/LessonNotes';
import LessonComments from '@/components/student/LessonComments';
import RatingWidget from '@/components/student/RatingWidget';
import LessonQuizSection from '@/components/student/LessonQuizSection';
import CourseContentSidebar from '@/components/student/CourseContentSidebar';

// Helper to extract YouTube ID
const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

interface LessonWithDetails extends Lesson {
    course: Course & {
        teacher: Profile;
    };
    resources: LessonResource[];
}

export default function LessonPlayer() {
    const { id } = useParams();
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const navigate = useNavigate();

    const [lesson, setLesson] = useState<LessonWithDetails | null>(null);
    const [progress, setProgress] = useState<LessonProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [currentTime, setCurrentTime] = useState(0); // For video timestamp

    // Refs for tracking
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const playerRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (id && profile?.id) {
            checkAccessAndFetch();
        }
        return () => stopTracking();
    }, [id, profile?.id]);

    const checkAccessAndFetch = async () => {
        setLoading(true);
        setAccessDenied(false);

        // 1. Check access
        const { data: hasAccess } = await supabase.rpc('check_lesson_access', {
            p_user_id: profile!.id,
            p_lesson_id: id!
        } as any);

        if (!hasAccess) {
            setAccessDenied(true);
            setLoading(false);
            return;
        }

        // 2. Fetch lesson details
        const { data: lessonData } = await supabase
            .from('lessons')
            .select(`
                *,
                course:courses(*, teacher:profiles(*)),
                resources:lesson_resources(*)
            `)
            .eq('id', id!)
            .single()
            .returns<Lesson>();

        if (lessonData) {
            setLesson(lessonData as LessonWithDetails);

            // 3. Fetch progress
            const { data: progressData } = await supabase
                .from('lesson_progress')
                .select('*')
                .eq('lesson_id', id!)
                .eq('user_id', profile!.id)
                .single();

            setProgress(progressData);

            // If already tracked, set start time
            if (progressData?.last_position_seconds) {
                setCurrentTime(progressData.last_position_seconds);
            }

            startTracking();
        }

        setLoading(false);
    };

    const startTracking = () => {
        stopTracking();
        // Auto-save every 10 seconds
        progressIntervalRef.current = setInterval(saveProgress, 10000);
    };

    const stopTracking = () => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }
    };

    // Mock time increment for V1
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const saveProgress = async () => {
        if (!lesson || !profile?.id) return;

        // Calculate percent
        const duration = lesson.duration_seconds || 600; // default 10min if unknown
        const percent = Math.min(100, Math.round((currentTime / duration) * 100));

        // Mark complete if > 90%
        const isComplete = percent >= 90;
        const completedAt = isComplete ? new Date().toISOString() : null;

        const payload = {
            user_id: profile.id,
            lesson_id: lesson.id,
            progress_percent: percent,
            last_position_seconds: Math.floor(currentTime),
            // Only set completed_at if not already set
            ...(isComplete && !progress?.completed_at ? { completed_at: completedAt } : {})
        };

        const { data } = await supabase
            .from('lesson_progress')
            .upsert(payload as any, { onConflict: 'user_id,lesson_id' })
            .select()
            .single();

        if (data) setProgress(data);
    };

    const handleMarkComplete = async () => {
        if (!lesson || !profile?.id) return;

        await supabase
            .from('lesson_progress')
            .upsert({
                user_id: profile.id,
                lesson_id: lesson.id,
                progress_percent: 100,
                last_position_seconds: lesson.duration_seconds || currentTime,
                completed_at: new Date().toISOString()
            }, { onConflict: 'user_id,lesson_id' });

        // Refresh
        checkAccessAndFetch();
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    const accessDeniedTitle = useTemplate('paywall.access_denied.title', 'عفواً، لا يمكنك الوصول لهذا الدرس', 'Access Denied');
    const accessDeniedMsg = useTemplate('paywall.access_denied.message', 'يجب الاشتراك للوصول لهذا الدرس', 'You must subscribe to access this lesson');
    const backBtnText = useTemplate('paywall.back_btn', 'العودة للمراحل', 'Back to Stages');

    if (accessDenied) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold mb-2">{accessDeniedTitle}</h1>
                <p className="text-muted-foreground mb-6">{accessDeniedMsg}</p>
                <Link to="/student/stages"><Button>{backBtnText}</Button></Link>
            </div>
        );
    }

    if (!lesson) return null;

    const youtubeId = lesson.full_video_url ? getYoutubeId(lesson.full_video_url) : null;
    const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;

    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top Bar */}
            <div className="bg-background border-b border-border sticky top-0 z-20 px-4 h-14 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to="/student/stages">
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
                {/* Progress Indicator (Mini) */}
                {progress?.completed_at && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        {t('مكتمل', 'Completed')}
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">

                {/* Main Content Area (Scrollable) */}
                <div className="flex-1 flex flex-col overflow-y-auto bg-background">
                    {/* Video Container (Black BG) */}
                    <div className="w-full bg-black aspect-video lg:max-h-[70vh] flex items-center justify-center shrink-0">
                        {youtubeId ? (
                            <iframe
                                ref={playerRef}
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&start=${Math.floor(progress?.last_position_seconds || 0)}`}
                                title="Video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        ) : (
                            <div className="text-white text-center">
                                <p>{t('لا يوجد فيديو متاح', 'No video available')}</p>
                            </div>
                        )}
                    </div>

                    {/* Tabs Navigation */}
                    <div className="border-b border-border sticky top-0 bg-background z-10 px-4">
                        <div className="flex gap-6 overflow-x-auto">
                            {['overview', 'qa', 'notes', 'reviews'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {tab === 'overview' && t('نظرة عامة', 'Overview')}
                                    {tab === 'qa' && t('الأسئلة والنقاش', 'Q&A')}
                                    {tab === 'notes' && t('ملاحظاتي', 'Notes')}
                                    {tab === 'reviews' && t('التقييمات', 'Reviews')}
                                </button>
                            ))}
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

                                {/* Instructor */}
                                <div className="flex items-center gap-4 p-4 border border-border rounded-lg bg-card/50">
                                    <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden shrink-0">
                                        {lesson.course.teacher.avatar_url ? (
                                            <img src={lesson.course.teacher.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                                                {lesson.course.teacher.full_name?.[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{lesson.course.teacher.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{t('محاضر الدورة', 'Course Instructor')}</p>
                                    </div>
                                    <div className="mr-auto">
                                        <Link to={`/student/messages?teacher=${lesson.course.teacher.id}`}>
                                            <Button variant="outline" size="sm">
                                                {t('مراسلة', 'Message')}
                                            </Button>
                                        </Link>
                                    </div>
                                </div>

                                {/* Resources */}
                                {lesson.resources && lesson.resources.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            {t('المرفقات', 'Resources')}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {lesson.resources.map(res => (
                                                <a
                                                    key={res.id}
                                                    href={res.url}
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

                        {activeTab === 'qa' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <LessonComments lessonId={lesson.id} />
                            </div>
                        )}

                        {activeTab === 'notes' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <LessonNotes lessonId={lesson.id} currentTime={currentTime} />
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <RatingWidget entityId={lesson.id} entityType="lesson" title={t('تقييم الدرس', 'Rate this Lesson')} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar (Desktop: Right, Mobile: Hidden/Bottom?) */}
                {/* For MVP, let's keep it visible on desktop side-by-side. On mobile, maybe below? or Drawer. */}
                {/* Current approach: Hidden on mobile unless toggled? No, Udemy puts it below content on mobile. */}
                {/* Let's make it a fixed width sidebar on LG screens. */}

                <div className="w-full lg:w-96 border-l border-border bg-background lg:h-full overflow-hidden flex flex-col shrink-0">
                    <CourseContentSidebar
                        courseId={lesson.course_id}
                        currentLessonId={lesson.id}
                        userId={profile!.id}
                    />
                </div>
            </div>
        </div>
    );
}
