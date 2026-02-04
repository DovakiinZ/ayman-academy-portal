import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Lesson, Course, LessonResource, LessonProgress, Profile } from '@/types/database';
import { Loader2, ChevronRight, ChevronLeft, FileText, Download, CheckCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LessonNotes from '@/components/student/LessonNotes';
import LessonComments from '@/components/student/LessonComments';
import RatingWidget from '@/components/student/RatingWidget';
import LessonQuizSection from '@/components/student/LessonQuizSection';

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
        });

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
            .single();

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
            .upsert(payload, { onConflict: 'user_id,lesson_id' })
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

    if (accessDenied) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold mb-2">{t('عفواً، لا يمكنك الوصول لهذا الدرس', 'Access Denied')}</h1>
                <p className="text-muted-foreground mb-6">{t('يجب الاشتراك في الدورة لمشاهدة هذا الدرس', 'You must subscribe to access this lesson')}</p>
                <Link to="/student/courses"><Button>{t('العودة للدورات', 'Back to Courses')}</Button></Link>
            </div>
        );
    }

    if (!lesson) return null;

    const youtubeId = lesson.full_video_url ? getYoutubeId(lesson.full_video_url) : null;
    const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;

    return (
        <div className="min-h-screen bg-background pb-12">
            {/* Top Bar */}
            <div className="bg-background border-b border-border sticky top-0 z-20 px-4 h-16 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to={`/student/courses`}>
                        <Button variant="ghost" size="icon">
                            <BackIcon className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="font-semibold text-foreground line-clamp-1">
                            {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                        </h1>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                            {t(lesson.course.title_ar, lesson.course.title_en || lesson.course.title_ar)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {progress?.completed_at ? (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            {t('مكتمل', 'Completed')}
                        </div>
                    ) : (
                        <Button variant="outline" size="sm" onClick={handleMarkComplete}>
                            {t('تحديد كمكتمل', 'Mark Complete')}
                        </Button>
                    )}
                </div>
            </div>

            <div className="container mx-auto max-w-7xl p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Content (Left/Right depending on RTL) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Video Player */}
                    <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg relative group">
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
                            ></iframe>
                        ) : (
                            <div className="flex items-center justify-center h-full text-white">
                                <p>{t('لا يوجد فيديو متاح', 'No video available')}</p>
                            </div>
                        )}
                    </div>

                    {/* Lesson Info */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">
                                {t('عن هذا الدرس', 'About this lesson')}
                            </h2>
                        </div>
                        <div className="prose dark:prose-invert max-w-none">
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {t(lesson.summary_ar || '', lesson.summary_en || lesson.summary_ar || '')}
                            </p>
                        </div>
                    </div>

                    {/* Resources */}
                    {lesson.resources && lesson.resources.length > 0 && (
                        <div className="bg-secondary/10 p-4 rounded-lg border border-border">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                {t('المرفقات والمصادر', 'Resources')}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {lesson.resources.map(res => (
                                    <a
                                        key={res.id}
                                        href={res.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center p-3 bg-background border border-border rounded-md hover:border-primary transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                            <Download className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="ms-3 overflow-hidden">
                                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                                {t(res.title_ar, res.title_en || res.title_ar)}
                                            </p>
                                            <p className="text-xs text-muted-foreground uppercase">{res.type}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quiz Section */}
                    <div className="mt-8">
                        <LessonQuizSection lessonId={lesson.id} />
                    </div>

                    {/* Comments */}
                    <div className="pt-6 border-t border-border mt-8">
                        <LessonComments lessonId={lesson.id} />
                    </div>
                </div>

                {/* Sidebar (Right/Left) */}
                <div className="space-y-6">
                    {/* Notes */}
                    <LessonNotes lessonId={lesson.id} currentTime={currentTime} />

                    {/* Rating logic */}
                    <RatingWidget entityId={lesson.id} entityType="lesson" title={t('تقييم الدرس', 'Rate this Lesson')} />

                    {/* Teacher Info */}
                    <div className="bg-background border border-border rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                            {t('مقدم الدرس', 'Instructor')}
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                {lesson.course.teacher.avatar_url ? (
                                    <img src={lesson.course.teacher.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-lg font-bold text-muted-foreground">
                                        {lesson.course.teacher.full_name?.[0]}
                                    </span>
                                )}
                            </div>
                            <div>
                                <p className="font-medium text-foreground">{lesson.course.teacher.full_name}</p>
                                <Link to={`/student/messages?teacher=${lesson.course.teacher.id}`}>
                                    <p className="text-xs text-primary hover:underline mt-1">
                                        {t('إرسال رسالة', 'Send Message')}
                                    </p>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
