import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Subscription, LessonProgress, Lesson, Course, Profile } from '@/types/database';
import { BookOpen, Users, Clock, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContinueWatchingItem extends LessonProgress {
    lesson: Lesson & {
        title_ar: string;
        title_en: string | null;
        full_video_url?: string | null;
        course: Course & {
            title_ar: string;
            title_en: string | null;
            teacher: Profile;
        };
    };
}

// Helper
const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export default function StudentDashboard() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.id) {
            fetchDashboardData();
        }
    }, [profile?.id]);

    const fetchDashboardData = async () => {
        if (!profile?.id) return;

        // Fetch subscriptions
        const { data: subs } = await supabase
            .from('subscriptions')
            .select('*, plan:plans(*)')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false });

        if (subs) setSubscriptions(subs);

        // Fetch continue watching (incomplete lessons)
        const { data: progress } = await supabase
            .from('lesson_progress')
            .select(`
                *,
                lesson:lessons(
                    *,
                    course:courses(
                        *,
                        teacher:profiles(*)
                    )
                )
            `)
            .eq('user_id', profile.id)
            .is('completed_at', null)
            .gt('progress_percent', 0)
            .order('updated_at', { ascending: false })
            .limit(10);

        if (progress) setContinueWatching(progress as ContinueWatchingItem[]);

        // Get accessible teachers (Full profiles)
        const { data: teachersData } = await supabase.rpc('get_student_teachers', { p_user_id: profile.id });
        if (teachersData) setTeachers(teachersData); // Assuming RPC returns array of profiles

        setLoading(false);
    };

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'expired': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return t('نشط', 'Active');
            case 'expired': return t('منتهي', 'Expired');
            case 'pending': return t('قيد الانتظار', 'Pending');
            case 'canceled': return t('ملغي', 'Canceled');
            default: return status;
        }
    };

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

                    {/* Primary Resume Item (Most recent) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <div className="lg:col-span-2 relative group">
                            <Link to={`/student/lesson/${continueWatching[0].lesson_id}`}>
                                <div className="aspect-video bg-black/5 rounded-xl overflow-hidden border border-border relative">
                                    {continueWatching[0].lesson.full_video_url ? (
                                        <img
                                            src={`https://img.youtube.com/vi/${getYoutubeId(continueWatching[0].lesson.full_video_url)}/maxresdefault.jpg`}
                                            alt={continueWatching[0].lesson.title_ar}
                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-secondary">
                                            <Play className="w-16 h-16 text-muted-foreground/50" />
                                        </div>
                                    )}

                                    {/* Overlay Play Button */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                            <Play className="w-8 h-8 fill-current ml-1" />
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/20">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${continueWatching[0].progress_percent}%` }}
                                        />
                                    </div>
                                </div>
                            </Link>
                        </div>

                        <div className="flex flex-col justify-center">
                            <p className="text-sm text-primary font-medium mb-2 uppercase tracking-wider">
                                {t('آخر درس شاهدته', 'Last watched')}
                            </p>
                            <h3 className="text-3xl font-bold text-foreground mb-3 leading-tight">
                                {t(continueWatching[0].lesson.title_ar, continueWatching[0].lesson.title_en || continueWatching[0].lesson.title_ar)}
                            </h3>
                            <p className="text-lg text-muted-foreground mb-6">
                                {t(continueWatching[0].lesson.course.title_ar, continueWatching[0].lesson.course.title_en || continueWatching[0].lesson.course.title_ar)}
                            </p>

                            <Link to={`/student/lesson/${continueWatching[0].lesson_id}`}>
                                <Button size="lg" className="w-full sm:w-auto px-8 text-lg h-12">
                                    {t('استئناف الدرس', 'Resume Lesson')}
                                    <Play className="w-5 h-5 ml-2 fill-current" />
                                </Button>
                            </Link>

                            {/* Stats mini */}
                            <div className="flex items-center gap-6 mt-8 pt-6 border-t border-border">
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{continueWatching[0].progress_percent}%</p>
                                    <p className="text-xs text-muted-foreground">{t('مكتمل', 'Completed')}</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{Math.floor(continueWatching[0].last_position_seconds / 60)}</p>
                                    <p className="text-xs text-muted-foreground">{t('دقيقة شاهدتها', 'Mins watched')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access List (Next 3) */}
                    {continueWatching.length > 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {continueWatching.slice(1, 4).map((item) => (
                                <Link
                                    key={item.id}
                                    to={`/student/lesson/${item.lesson_id}`}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors group"
                                >
                                    <div className="w-24 aspect-video rounded-md bg-muted overflow-hidden relative shrink-0">
                                        {item.lesson.full_video_url && (
                                            <img
                                                src={`https://img.youtube.com/vi/${getYoutubeId(item.lesson.full_video_url)}/mqdefault.jpg`}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10">
                                            <Play className="w-6 h-6 text-white opacity-80" />
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                                            <div className="h-full bg-primary" style={{ width: `${item.progress_percent}%` }} />
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">
                                            {t(item.lesson.title_ar, item.lesson.title_en || item.lesson.title_ar)}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {t(item.lesson.course.title_ar, item.lesson.course.title_en || item.lesson.course.title_ar)}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <div className="bg-primary/5 rounded-2xl p-8 text-center border border-primary/10">
                    <h2 className="text-2xl font-bold text-primary mb-2">
                        {t('ابدأ رحلتك التعليمية', 'Start Your Learning Journey')}
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        {t('استكشف المواد الدراسية وابدأ التعلم اليوم', 'Explore subjects and start learning today')}
                    </p>
                    <Link to="/student/stages">
                        <Button size="lg">{t('تصفح المواد', 'Browse Subjects')}</Button>
                    </Link>
                </div>
            )}

            {/* 2. My Teachers (Netflix Style) */}
            {teachers.length > 0 && (
                <section>
                    <h2 className="text-xl font-bold text-foreground mb-4">
                        {t('معلمي', 'My Teachers')}
                    </h2>
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                        {teachers.map((teacher: any) => (
                            <Link
                                key={teacher.id}
                                to={`/student/messages?teacher=${teacher.id}`}
                                className="snap-start flex-shrink-0 w-48 group text-center"
                            >
                                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-border group-hover:border-primary transition-colors mb-3">
                                    <img
                                        src={teacher.avatar_url || `https://ui-avatars.com/api/?name=${teacher.full_name}`}
                                        alt={teacher.full_name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                    {teacher.full_name}
                                </h3>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* 3. My Subjects (Grid) */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-foreground">
                        {t('موادي الدراسية', 'My Subjects')}
                    </h2>
                    <Link to="/student/stages" className="text-sm text-primary hover:underline">
                        {t('كل المواد', 'All Subjects')}
                    </Link>
                </div>

                {subscriptions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subscriptions.map((sub) => (
                            <Link
                                key={sub.id}
                                to={`/student/stages`} // Ideally to specific subject if plan is subject scoped
                                className="bg-background border border-border rounded-xl p-5 hover:border-primary/50 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-foreground" />
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getStatusColor(sub.status)}`}>
                                        {getStatusLabel(sub.status)}
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg mb-1">
                                    {t(sub.plan?.title_ar || '', sub.plan?.title_en || sub.plan?.title_ar)}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                    {t(sub.plan?.description_ar || '', sub.plan?.description_en || sub.plan?.description_ar)}
                                </p>
                                {/* Mock Progress for plan */}
                                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[0%]" />
                                </div>
                                <p className="text-xs text-right mt-1.5 text-muted-foreground">0%</p>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">{t('لم تقم بالتسجيل في أي مواد بعد.', 'You strictly not enrolled in any subjects yet.')}</p>
                )}
            </section>
        </div>
    );
}
