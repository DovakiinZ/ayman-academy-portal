import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { LessonProgress, Lesson, Subject, Stage, Profile } from '@/types/database';
import { BookOpen, Play, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContinueWatchingItem extends LessonProgress {
    lesson: Lesson & {
        title_ar: string;
        title_en: string | null;
        subject: Subject & {
            title_ar: string;
            title_en: string | null;
            stage: Stage;
        };
        content_items: { type: string, url: string }[];
    };
}

// Helper
const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export default function StudentDashboard() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.id) {
            fetchDashboardData();
        }
    }, [profile?.id]);

    const fetchDashboardData = async () => {
        if (!profile?.id) return;

        // Fetch continue watching (incomplete lessons)
        const { data: progress } = await supabase
            .from('lesson_progress')
            .select(`
                *,
                lesson:lessons(
                    *,
                    subject:subjects(
                        *,
                        stage:stages(*)
                    ),
                    content_items:lesson_content_items(type, url)
                )
            `)
            .eq('user_id', profile.id)
            .is('completed_at', null)
            .gt('progress_percent', 0)
            .order('updated_at', { ascending: false })
            .limit(3);

        if (progress) {
            // Type assertion needs care due to complex join
            setContinueWatching(progress as unknown as ContinueWatchingItem[]);
        }

        setLoading(false);
    };

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-12">
            {/* 1. Continue Learning (Hero Section) */}
            {continueWatching.length > 0 ? (
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-foreground">
                            {t('متابعة المشاهدة', 'Continue Watching')}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {continueWatching.map((item) => {
                            const videoItem = item.lesson.content_items?.find(i => i.type === 'video');
                            const videoUrl = videoItem?.url;

                            return (
                                <Link
                                    key={item.id}
                                    to={`/student/lesson/${item.lesson_id}`}
                                    className="group relative flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all"
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-video bg-muted relative overflow-hidden">
                                        {videoUrl ? (
                                            <img
                                                src={`https://img.youtube.com/vi/${getYoutubeId(videoUrl)}/mqdefault.jpg`}
                                                alt=""
                                                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-secondary">
                                                <Play className="w-12 h-12 text-muted-foreground/30" />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-background/90 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-110 transition-transform">
                                                <Play className="w-5 h-5 text-primary ml-0.5" />
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                                            <div
                                                className="h-full bg-primary transition-all duration-300"
                                                style={{ width: `${item.progress_percent}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                                {t(item.lesson.subject.title_ar, item.lesson.subject.title_en || item.lesson.subject.title_ar)}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                {t(item.lesson.subject.stage?.title_ar || '', item.lesson.subject.stage?.title_en || item.lesson.subject.stage?.title_ar || '')}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                                            {t(item.lesson.title_ar, item.lesson.title_en || item.lesson.title_ar)}
                                        </h3>

                                        <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{Math.floor(item.last_position_seconds / 60)} {t('دقيقة', 'mins')}</span>
                                            </div>
                                            <span>{item.progress_percent}% {t('مكتمل', 'Done')}</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            ) : (
                <div className="bg-primary/5 rounded-2xl p-12 text-center border border-primary/10">
                    <h2 className="text-2xl font-bold text-primary mb-3">
                        {t('مرحباً بك في أكاديمية أيمن', 'Welcome to Ayman Academy')}
                    </h2>
                    <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                        {t('ابدأ رحلتك التعليمية الآن باستعراض المراحل الدراسية والمواد المتاحة', 'Start your learning journey now by browsing available stages and subjects')}
                    </p>
                    <Link to="/student/stages">
                        <Button size="lg" className="px-8">{t('تصفح المراحل الدراسية', 'Browse Stages')}</Button>
                    </Link>
                </div>
            )}

            {/* Quick Links Section */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-foreground">
                        {t('استكشف المزيد', 'Explore More')}
                    </h2>
                    <Link to="/student/stages" className="text-sm text-primary hover:underline flex items-center gap-1">
                        {t('عرض الكل', 'View All')}
                        <ChevronIcon className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link to="/student/stages" className="p-6 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{t('المراحل الدراسية', 'Educational Stages')}</h3>
                            <p className="text-xs text-muted-foreground">{t('تصفح جميع المواد والكورسات', 'Browse all subjects and courses')}</p>
                        </div>
                    </Link>

                    {/* Add more quick links if needed, e.g. "My Profile" or "Support" */}
                </div>
            </section>
        </div>
    );
}
