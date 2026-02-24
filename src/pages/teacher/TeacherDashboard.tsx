import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BookOpen, Video, Plus, BookMarked, ClipboardList, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Stats {
    subjects: number;
    lessons: number;
    publishedLessons: number;
    quizzes: number;
}

function useTeacherStats(userId: string | undefined) {
    return useQuery({
        queryKey: ['teacher', userId, 'stats'],
        queryFn: async () => {
            // Get all lessons by this teacher
            const { data: lessons, error } = await supabase
                .from('lessons')
                .select('id, subject_id, is_published')
                .eq('created_by', userId!);

            if (error) throw error;
            const allLessons = lessons || [];

            // Unique subjects
            const subjectIds = new Set(allLessons.map(l => l.subject_id).filter(Boolean));

            // Published count
            const publishedCount = allLessons.filter(l => l.is_published).length;

            // Quiz count
            let quizCount = 0;
            if (allLessons.length > 0) {
                const { count } = await supabase
                    .from('lesson_quizzes')
                    .select('id', { count: 'exact', head: true })
                    .in('lesson_id', allLessons.map(l => l.id));
                quizCount = count || 0;
            }

            return {
                subjects: subjectIds.size,
                lessons: allLessons.length,
                publishedLessons: publishedCount,
                quizzes: quizCount,
            } as Stats;
        },
        enabled: !!userId,
        staleTime: 3 * 60 * 1000,
    });
}

export default function TeacherDashboard() {
    const { t } = useLanguage();
    const { profile, user } = useAuth();
    const { data: stats, isLoading: loading } = useTeacherStats(user?.id);

    const statCards = [
        { label: { ar: 'موادي', en: 'My Subjects' }, value: stats?.subjects || 0, icon: BookMarked, color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
        { label: { ar: 'دروسي', en: 'My Lessons' }, value: stats?.lessons || 0, icon: Video, color: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400' },
        { label: { ar: 'دروس منشورة', en: 'Published' }, value: stats?.publishedLessons || 0, icon: BookOpen, color: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400' },
        { label: { ar: 'الاختبارات', en: 'Quizzes' }, value: stats?.quizzes || 0, icon: ClipboardList, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
    ];

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('مرحباً', 'Welcome')}, {profile?.full_name || profile?.email}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('لوحة تحكم المعلم', 'Teacher Dashboard')}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((stat) => (
                    <div key={stat.label.en} className="bg-background rounded-lg border border-border p-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-foreground">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stat.value}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t(stat.label.ar, stat.label.en)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-background rounded-lg border border-border p-6">
                <h2 className="text-lg font-medium text-foreground mb-4">
                    {t('إجراءات سريعة', 'Quick Actions')}
                </h2>
                <div className="flex flex-wrap gap-3">
                    <Button asChild>
                        <Link to="/teacher/lessons">
                            <Plus className="w-4 h-4 me-2" />
                            {t('إنشاء درس جديد', 'Create New Lesson')}
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link to="/teacher/subjects">
                            <BookMarked className="w-4 h-4 me-2" />
                            {t('عرض موادي', 'View My Subjects')}
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link to="/teacher/quizzes">
                            <ClipboardList className="w-4 h-4 me-2" />
                            {t('الاختبارات', 'Quizzes')}
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
