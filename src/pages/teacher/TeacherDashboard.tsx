import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BookOpen, Video, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Stats {
    courses: number;
    lessons: number;
    publishedCourses: number;
}

export default function TeacherDashboard() {
    const { t } = useLanguage();
    const { profile, user } = useAuth();
    const [stats, setStats] = useState<Stats>({ courses: 0, lessons: 0, publishedCourses: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            if (!user) return;

            const [coursesRes, publishedRes] = await Promise.all([
                supabase.from('courses').select('id', { count: 'exact', head: true }).eq('teacher_id', user.id),
                supabase.from('courses').select('id', { count: 'exact', head: true }).eq('teacher_id', user.id).eq('is_published', true),
            ]);

            // Get lessons count
            const { data: courses } = await supabase.from('courses').select('id').eq('teacher_id', user.id);
            let lessonsCount = 0;
            if (courses && courses.length > 0) {
                const { count } = await supabase
                    .from('lessons')
                    .select('id', { count: 'exact', head: true })
                    .in('course_id', courses.map(c => c.id));
                lessonsCount = count || 0;
            }

            setStats({
                courses: coursesRes.count || 0,
                lessons: lessonsCount,
                publishedCourses: publishedRes.count || 0,
            });
            setLoading(false);
        }

        fetchStats();
    }, [user]);

    const statCards = [
        { label: { ar: 'دوراتي', en: 'My Courses' }, value: stats.courses, icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
        { label: { ar: 'دروسي', en: 'My Lessons' }, value: stats.lessons, icon: Video, color: 'bg-green-50 text-green-600' },
        { label: { ar: 'دورات منشورة', en: 'Published' }, value: stats.publishedCourses, icon: BookOpen, color: 'bg-purple-50 text-purple-600' },
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
            <div className="grid grid-cols-3 gap-4 mb-8">
                {statCards.map((stat) => (
                    <div key={stat.label.en} className="bg-background rounded-lg border border-border p-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-foreground">
                                    {loading ? '-' : stat.value}
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
                        <Link to="/teacher/courses/new">
                            <Plus className="w-4 h-4 me-2" />
                            {t('إنشاء دورة جديدة', 'Create New Course')}
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link to="/teacher/courses">
                            <BookOpen className="w-4 h-4 me-2" />
                            {t('عرض دوراتي', 'View My Courses')}
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
