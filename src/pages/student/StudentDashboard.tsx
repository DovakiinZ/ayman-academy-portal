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
        course: Course & {
            teacher: Profile;
        };
    };
}

export default function StudentDashboard() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
    const [teachersCount, setTeachersCount] = useState(0);
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

        // Get accessible teachers count
        const { data: teachers } = await supabase.rpc('get_student_teachers', { p_user_id: profile.id });
        if (teachers) setTeachersCount(teachers.length);

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
        <div className="space-y-8">
            {/* Welcome */}
            <div>
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('مرحباً', 'Welcome')}, {profile?.full_name || t('طالب', 'Student')}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {t('تابع رحلتك التعليمية معنا', 'Continue your learning journey with us')}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-background rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-foreground">{subscriptions.filter(s => s.status === 'active').length}</p>
                            <p className="text-sm text-muted-foreground">{t('اشتراكات نشطة', 'Active Subscriptions')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-background rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-foreground">{teachersCount}</p>
                            <p className="text-sm text-muted-foreground">{t('معلمون', 'Teachers')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-background rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-foreground">{continueWatching.length}</p>
                            <p className="text-sm text-muted-foreground">{t('دروس قيد التقدم', 'Lessons in Progress')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Continue Watching */}
            {continueWatching.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-foreground">
                            {t('متابعة المشاهدة', 'Continue Watching')}
                        </h2>
                        <Link to="/student/courses" className="text-sm text-primary hover:underline">
                            {t('عرض الكل', 'View All')}
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {continueWatching.slice(0, 6).map((item) => (
                            <Link
                                key={item.id}
                                to={`/student/lesson/${item.lesson_id}`}
                                className="bg-background rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="aspect-video bg-secondary/50 flex items-center justify-center relative">
                                    <Play className="w-8 h-8 text-muted-foreground" />
                                    {/* Progress bar */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${item.progress_percent}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h3 className="font-medium text-foreground line-clamp-1">
                                        {t(item.lesson?.title_ar, item.lesson?.title_en || item.lesson?.title_ar)}
                                    </h3>
                                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                        {t(item.lesson?.course?.title_ar, item.lesson?.course?.title_en || item.lesson?.course?.title_ar)}
                                    </p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-muted-foreground">
                                            {item.progress_percent}% {t('مكتمل', 'complete')}
                                        </span>
                                        <Button size="sm" variant="ghost" className="h-7 text-xs">
                                            {t('متابعة', 'Continue')}
                                            <ChevronIcon className="w-3 h-3 ms-1" />
                                        </Button>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* My Subscriptions */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">
                        {t('اشتراكاتي', 'My Subscriptions')}
                    </h2>
                </div>

                {subscriptions.length === 0 ? (
                    <div className="bg-background rounded-lg border border-border p-6 text-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">
                            {t('لا توجد اشتراكات حالياً', 'No subscriptions yet')}
                        </p>
                        <Link to="/plans">
                            <Button className="mt-4">
                                {t('تصفح الخطط', 'Browse Plans')}
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {subscriptions.map((sub) => (
                            <div
                                key={sub.id}
                                className="bg-background rounded-lg border border-border p-4 flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="font-medium text-foreground">
                                        {t(sub.plan?.title_ar || '', sub.plan?.title_en || sub.plan?.title_ar || '')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {sub.ends_at
                                            ? `${t('ينتهي في', 'Expires')} ${new Date(sub.ends_at).toLocaleDateString()}`
                                            : t('غير محدود', 'Unlimited')
                                        }
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                                    {getStatusLabel(sub.status)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
