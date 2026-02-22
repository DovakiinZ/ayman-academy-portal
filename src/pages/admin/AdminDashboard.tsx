import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { safeFetchSimple, clearCache } from '@/lib/safeFetch';
import { GraduationCap, BookOpen, PlayCircle, UserPlus, AlertCircle, RefreshCw, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminStats {
    teachers: number;
    stages: number;
    subjects: number;
    lessons: number;
    students: number;
    pendingInvites: number;
}

const initialStats: AdminStats = {
    teachers: 0,
    stages: 0,
    subjects: 0,
    lessons: 0,
    students: 0,
    pendingInvites: 0,
};

export default function AdminDashboard() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [stats, setStats] = useState<AdminStats>(initialStats);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mountedRef = useRef(true);
    const initialLoadDone = useRef(false);

    const fetchStats = async () => {
        if (!mountedRef.current) return;

        // Only show loading spinner on initial load, not when navigating back
        if (!initialLoadDone.current) {
            setLoading(true);
        }
        setError(null);

        try {
            // Fetch all counts in parallel
            const [
                teachersResult,
                stagesResult,
                subjectsResult,
                lessonsResult,
                studentsResult,
                invitesResult
            ] = await Promise.all([
                safeFetchSimple(
                    async () => {
                        const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
                        return { data: { count: count ?? 0 }, error };
                    },
                    { count: 0 },
                    'admin-teachers-count'
                ),
                safeFetchSimple(
                    async () => {
                        const { count, error } = await supabase.from('stages').select('*', { count: 'exact', head: true });
                        return { data: { count: count ?? 0 }, error };
                    },
                    { count: 0 },
                    'admin-stages-count'
                ),
                safeFetchSimple(
                    async () => {
                        const { count, error } = await supabase.from('subjects').select('*', { count: 'exact', head: true });
                        return { data: { count: count ?? 0 }, error };
                    },
                    { count: 0 },
                    'admin-subjects-count'
                ),
                safeFetchSimple(
                    async () => {
                        const { count, error } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
                        return { data: { count: count ?? 0 }, error };
                    },
                    { count: 0 },
                    'admin-lessons-count'
                ),
                safeFetchSimple(
                    async () => {
                        const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
                        return { data: { count: count ?? 0 }, error };
                    },
                    { count: 0 },
                    'admin-students-count'
                ),
                safeFetchSimple(
                    async () => {
                        const { count, error } = await supabase.from('teacher_invites').select('*', { count: 'exact', head: true }).eq('status', 'pending');
                        return { data: { count: count ?? 0 }, error };
                    },
                    { count: 0 },
                    'admin-invites-count'
                ),
            ]);

            if (!mountedRef.current) return;

            setStats({
                teachers: (teachersResult.data as any).count ?? 0,
                stages: (stagesResult.data as any).count ?? 0,
                subjects: (subjectsResult.data as any).count ?? 0,
                lessons: (lessonsResult.data as any).count ?? 0,
                students: (studentsResult.data as any).count ?? 0,
                pendingInvites: (invitesResult.data as any).count ?? 0,
            });

            // Show error only if all crucial fetches failed
            const crucialErrors = [teachersResult.error, stagesResult.error, subjectsResult.error, lessonsResult.error].filter(Boolean);
            if (crucialErrors.length === 4) {
                setError(crucialErrors[0] || 'Failed to fetch dashboard data');
            }
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStats(initialStats);
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                initialLoadDone.current = true;
            }
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        fetchStats();

        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleRetry = () => {
        clearCache('admin-');
        fetchStats();
    };

    const statCards = [
        {
            title: t('المعلمون', 'Teachers'),
            value: stats.teachers,
            icon: GraduationCap,
            color: 'bg-blue-100 text-blue-600',
            link: '/admin/teachers',
        },
        {
            title: t('المراحل', 'Stages'),
            value: stats.stages,
            icon: BookOpen,
            color: 'bg-green-100 text-green-600',
            link: '/admin/stages',
        },
        {
            title: t('المواد', 'Subjects'),
            value: stats.subjects,
            icon: BookMarked,
            color: 'bg-orange-100 text-orange-600',
            link: '/admin/subjects',
        },
        {
            title: t('الدروس', 'Lessons'),
            value: stats.lessons,
            icon: PlayCircle,
            color: 'bg-purple-100 text-purple-600',
            link: '/admin/lessons',
        },
        {
            title: t('الطلاب', 'Students'),
            value: stats.students,
            icon: GraduationCap,
            color: 'bg-orange-100 text-orange-600',
            link: '/admin/enrollments',
        },
    ];

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('لوحة التحكم', 'Dashboard')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t(`مرحباً، ${user?.email?.split('@')[0] || 'مدير'}!`, `Welcome, ${user?.email?.split('@')[0] || 'Admin'}!`)}
                    </p>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-destructive">{t('حدث خطأ', 'An error occurred')}</p>
                            <p className="text-xs text-destructive/80">{error}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleRetry}>
                            <RefreshCw className="w-4 h-4 me-2" />
                            {t('إعادة المحاولة', 'Retry')}
                        </Button>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card, index) => (
                    <button
                        key={index}
                        onClick={() => navigate(card.link)}
                        className="bg-background p-6 rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all text-start group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.color}`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <div>
                                {loading ? (
                                    <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
                                ) : (
                                    <p className="text-3xl font-bold text-foreground">{card.value}</p>
                                )}
                                <p className="text-sm text-muted-foreground">{card.title}</p>
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            {t('عرض التفاصيل ←', 'View details →')}
                        </div>
                    </button>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
                <h2 className="text-lg font-medium text-foreground mb-4">
                    {t('إجراءات سريعة', 'Quick Actions')}
                </h2>
                <div className="grid gap-3 md:grid-cols-3">
                    <Button variant="outline" className="justify-start h-auto py-4" onClick={() => navigate('/admin/teachers')}>
                        <UserPlus className="w-5 h-5 me-3" />
                        <div className="text-start">
                            <p className="font-medium">{t('دعوة معلم', 'Invite Teacher')}</p>
                            <p className="text-xs text-muted-foreground">{t('إضافة معلم جديد للأكاديمية', 'Add a new teacher to the academy')}</p>
                        </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-4" onClick={() => navigate('/admin/subjects')}>
                        <BookMarked className="w-5 h-5 me-3" />
                        <div className="text-start">
                            <p className="font-medium">{t('إضافة مادة', 'Add Subject')}</p>
                            <p className="text-xs text-muted-foreground">{t('إنشاء مادة دراسية جديدة', 'Create a new study subject')}</p>
                        </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-4" onClick={() => navigate('/admin/stages')}>
                        <GraduationCap className="w-5 h-5 me-3" />
                        <div className="text-start">
                            <p className="font-medium">{t('إدارة المراحل', 'Manage Stages')}</p>
                            <p className="text-xs text-muted-foreground">{t('إدارة المراحل الدراسية', 'Manage academic stages')}</p>
                        </div>
                    </Button>
                </div>
            </div>
        </div>
    );
}
