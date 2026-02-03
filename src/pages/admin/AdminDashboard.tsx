import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { safeFetchSimple, clearCache } from '@/lib/safeFetch';
import { dummyStats } from '@/data/dummy';
import { GraduationCap, BookOpen, PlayCircle, UserPlus, AlertCircle, RefreshCw, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminStats {
    teachers: number;
    courses: number;
    lessons: number;
    pendingInvites: number;
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [stats, setStats] = useState<AdminStats>(dummyStats);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDummy, setIsDummy] = useState(false);
    const mountedRef = useRef(true);

    const fetchStats = async () => {
        if (!mountedRef.current) return;

        setLoading(true);
        setError(null);

        try {
            // Fetch all counts in parallel
            const [teachersResult, coursesResult, lessonsResult, invitesResult] = await Promise.all([
                safeFetchSimple(
                    () => supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
                    { count: dummyStats.teachers },
                    'admin-teachers-count'
                ),
                safeFetchSimple(
                    () => supabase.from('courses').select('id', { count: 'exact', head: true }),
                    { count: dummyStats.courses },
                    'admin-courses-count'
                ),
                safeFetchSimple(
                    () => supabase.from('lessons').select('id', { count: 'exact', head: true }),
                    { count: dummyStats.lessons },
                    'admin-lessons-count'
                ),
                safeFetchSimple(
                    () => supabase.from('teacher_invites').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
                    { count: dummyStats.pendingInvites },
                    'admin-invites-count'
                ),
            ]);

            if (!mountedRef.current) return;

            const isAnyDummy = [teachersResult, coursesResult, lessonsResult, invitesResult].some(r => r.source === 'dummy');
            setIsDummy(isAnyDummy);

            setStats({
                teachers: (teachersResult.data as { count?: number }).count ?? dummyStats.teachers,
                courses: (coursesResult.data as { count?: number }).count ?? dummyStats.courses,
                lessons: (lessonsResult.data as { count?: number }).count ?? dummyStats.lessons,
                pendingInvites: (invitesResult.data as { count?: number }).count ?? dummyStats.pendingInvites,
            });

            // Show error only if all failed
            const errors = [teachersResult.error, coursesResult.error, lessonsResult.error, invitesResult.error].filter(Boolean);
            if (errors.length === 4) {
                setError(errors[0] || 'Failed to fetch data');
            }
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStats(dummyStats);
            setIsDummy(true);
        } finally {
            if (mountedRef.current) {
                setLoading(false);
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
            title: t('الدورات', 'Courses'),
            value: stats.courses,
            icon: BookOpen,
            color: 'bg-green-100 text-green-600',
            link: '/admin/courses',
        },
        {
            title: t('الدروس', 'Lessons'),
            value: stats.lessons,
            icon: PlayCircle,
            color: 'bg-purple-100 text-purple-600',
            link: '/admin/courses',
        },
        {
            title: t('دعوات معلقة', 'Pending Invites'),
            value: stats.pendingInvites,
            icon: UserPlus,
            color: 'bg-amber-100 text-amber-600',
            link: '/admin/teachers',
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
                {isDummy && !loading && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700">
                        <Beaker className="w-3.5 h-3.5" />
                        {t('بيانات تجريبية', 'Demo Data')}
                    </div>
                )}
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
                    <Button variant="outline" className="justify-start h-auto py-4" onClick={() => navigate('/admin/courses')}>
                        <BookOpen className="w-5 h-5 me-3" />
                        <div className="text-start">
                            <p className="font-medium">{t('إضافة دورة', 'Add Course')}</p>
                            <p className="text-xs text-muted-foreground">{t('إنشاء دورة تعليمية جديدة', 'Create a new educational course')}</p>
                        </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-4" onClick={() => navigate('/admin/taxonomy')}>
                        <GraduationCap className="w-5 h-5 me-3" />
                        <div className="text-start">
                            <p className="font-medium">{t('إدارة التصنيفات', 'Manage Taxonomy')}</p>
                            <p className="text-xs text-muted-foreground">{t('إدارة المراحل والمواد الدراسية', 'Manage levels and subjects')}</p>
                        </div>
                    </Button>
                </div>
            </div>
        </div>
    );
}
