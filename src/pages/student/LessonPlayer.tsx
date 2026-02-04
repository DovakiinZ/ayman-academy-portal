import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTemplate } from '@/hooks/useTemplate';
import { supabase } from '@/lib/supabase';
import { Lesson, Subject, LessonContentItem, LessonProgress } from '@/types/database';
import { Loader2, ChevronRight, ChevronLeft, FileText, Download, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LessonNotes from '@/components/student/LessonNotes';
import LessonComments from '@/components/student/LessonComments';
import RatingWidget from '@/components/student/RatingWidget';
import CourseContentSidebar from '@/components/student/CourseContentSidebar';

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
    const [progress, setProgress] = useState<LessonProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [activeTab, setActiveTab] = useState('overview');

    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (id && profile?.id) {
            checkAccessAndFetch();
        }
        return () => stopTracking();
    }, [id, profile?.id]);

    const checkAccessAndFetch = async () => {
        setLoading(true);
        setAccessDenied(false);

        // 1. Check access (using new schema, likely just is_active check or direct fetch)
        // Access logic: Public for now based on Plan Part 3 "Student: SELECT only published"

        // 2. Fetch lesson details
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
        const videoItem = typedLesson.content_items?.find(item => item.type === 'video');
        if (videoItem?.url) {
            setCurrentVideoUrl(videoItem.url);
        }

        // 3. Fetch progress
        const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('*')
            .eq('lesson_id', id!)
            .eq('user_id', profile!.id)
            .single();

        setProgress(progressData);

        if (progressData?.last_position_seconds) {
            setCurrentTime(progressData.last_position_seconds);
        }

        startTracking();
        setLoading(false);
    };

    const startTracking = () => {
        stopTracking();
        progressIntervalRef.current = setInterval(saveProgress, 10000);
    };

    const stopTracking = () => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }
    };

    // Simplified Timer for V1
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const saveProgress = async () => {
        if (!lesson || !profile?.id) return;

        // Mock duration logic (10 mins)
        const duration = 600;
        const percent = Math.min(100, Math.round((currentTime / duration) * 100));
        const isComplete = percent >= 90;

        const payload = {
            user_id: profile.id,
            lesson_id: lesson.id,
            progress_percent: percent,
            last_position_seconds: Math.floor(currentTime),
            updated_at: new Date().toISOString(),
            ...(isComplete && !progress?.completed_at ? { completed_at: new Date().toISOString() } : {})
        };

        const { data } = await supabase
            .from('lesson_progress')
            .upsert(payload as any, { onConflict: 'user_id,lesson_id' })
            .select()
            .single();

        if (data) setProgress(data);
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
