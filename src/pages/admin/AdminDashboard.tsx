import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Users, BookOpen, GraduationCap, UserPlus } from 'lucide-react';

interface Stats {
    teachers: number;
    courses: number;
    lessons: number;
    pendingInvites: number;
}

export default function AdminDashboard() {
    const { t } = useLanguage();
    const [stats, setStats] = useState<Stats>({ teachers: 0, courses: 0, lessons: 0, pendingInvites: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            const [teachersRes, coursesRes, lessonsRes, invitesRes] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
                supabase.from('courses').select('id', { count: 'exact', head: true }),
                supabase.from('lessons').select('id', { count: 'exact', head: true }),
                supabase.from('teacher_invites').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            ]);

            setStats({
                teachers: teachersRes.count || 0,
                courses: coursesRes.count || 0,
                lessons: lessonsRes.count || 0,
                pendingInvites: invitesRes.count || 0,
            });
            setLoading(false);
        }

        fetchStats();
    }, []);

    const statCards = [
        { label: { ar: 'المعلمون', en: 'Teachers' }, value: stats.teachers, icon: Users, color: 'bg-blue-50 text-blue-600' },
        { label: { ar: 'الدورات', en: 'Courses' }, value: stats.courses, icon: BookOpen, color: 'bg-green-50 text-green-600' },
        { label: { ar: 'الدروس', en: 'Lessons' }, value: stats.lessons, icon: GraduationCap, color: 'bg-purple-50 text-purple-600' },
        { label: { ar: 'دعوات معلقة', en: 'Pending Invites' }, value: stats.pendingInvites, icon: UserPlus, color: 'bg-amber-50 text-amber-600' },
    ];

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('لوحة التحكم', 'Dashboard')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('نظرة عامة على الأكاديمية', 'Academy overview')}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Welcome message */}
            <div className="mt-8 bg-background rounded-lg border border-border p-6">
                <h2 className="text-lg font-medium text-foreground mb-2">
                    {t('مرحباً بك في لوحة تحكم أكاديمية أيمن', 'Welcome to Ayman Academy Dashboard')}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {t(
                        'من هنا يمكنك إدارة المعلمين والدورات والمحتوى التعليمي.',
                        'From here you can manage teachers, courses, and educational content.'
                    )}
                </p>
            </div>
        </div>
    );
}
