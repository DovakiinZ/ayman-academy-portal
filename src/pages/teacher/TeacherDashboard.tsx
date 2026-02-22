import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BookOpen, Video, Plus, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CourseHealthPanel from '@/components/teacher/CourseHealthPanel';
import type { Course } from '@/types/database';

interface Stats {
    courses: number;
    lessons: number;
    publishedCourses: number;
}

export default function TeacherDashboard() {
    const { t } = useLanguage();
    const { profile, user } = useAuth();
    const [stats, setStats] = useState<Stats>({ courses: 0, lessons: 0, publishedCourses: 0 });
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStatsAndCourses() {
            if (!user) return;

            const [coursesRes, publishedRes, allCoursesRes] = await Promise.all([
                (supabase.from('courses') as any).select('id', { count: 'exact', head: true }).eq('teacher_id', user.id),
                (supabase.from('courses') as any).select('id', { count: 'exact', head: true }).eq('teacher_id', user.id).eq('is_published', true),
                (supabase.from('courses') as any).select('*').eq('teacher_id', user.id).limit(5)
            ]);

            setCourses(allCoursesRes.data || []);
            if (allCoursesRes.data && allCoursesRes.data.length > 0) {
                setSelectedCourseId(allCoursesRes.data[0].id);
            }

            // Get lessons count
            const { data: teacherCourses } = await (supabase.from('courses') as any).select('id').eq('teacher_id', user.id);
            let lessonsCount = 0;
            if (teacherCourses && teacherCourses.length > 0) {
                const { count } = await (supabase
                    .from('lessons') as any)
                    .select('id', { count: 'exact', head: true })
                    .in('course_id', teacherCourses.map((c: any) => c.id));
                lessonsCount = count || 0;
            }

            setStats({
                courses: coursesRes.count || 0,
                lessons: lessonsCount,
                publishedCourses: publishedRes.count || 0,
            });
            setLoading(false);
        }

        fetchStatsAndCourses();
    }, [user]);

    const activeCourse = courses.find(c => c.id === selectedCourseId);

    const statCards = [
        { label: { ar: 'دوراتي', en: 'My Courses' }, value: stats.courses, icon: BookOpen, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
        { label: { ar: 'دروسي', en: 'My Lessons' }, value: stats.lessons, icon: Video, color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
        { label: { ar: 'دورات منشورة', en: 'Published' }, value: stats.publishedCourses, icon: BookOpen, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('مرحباً', 'Welcome')}, {profile?.full_name || profile?.email}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('لوحة تحكم المعلم — نظرة عامة', 'Teacher Dashboard — Overview')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link to="/teacher/courses">
                            {t('إدارة الدورات', 'Manage Courses')}
                        </Link>
                    </Button>
                    <Button asChild size="sm">
                        <Link to="/teacher/courses/new">
                            <Plus className="w-4 h-4 me-1" />
                            {t('دورة جديدة', 'New Course')}
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statCards.map((stat) => (
                    <div key={stat.label.en} className="bg-background rounded-xl border border-border p-5 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">
                                    {loading ? '-' : stat.value}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {t(stat.label.ar, stat.label.en)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* AI Insights Panel */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            {t('تحليلات جودة الدورة (AI)', 'Course Quality Insights (AI)')}
                        </h2>
                        {courses.length > 1 && (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost" size="icon" className="h-8 w-8"
                                    onClick={() => {
                                        const idx = courses.findIndex(c => c.id === selectedCourseId);
                                        const next = idx > 0 ? courses[idx - 1] : courses[courses.length - 1];
                                        setSelectedCourseId(next.id);
                                    }}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost" size="icon" className="h-8 w-8"
                                    onClick={() => {
                                        const idx = courses.findIndex(c => c.id === selectedCourseId);
                                        const next = idx < courses.length - 1 ? courses[idx + 1] : courses[0];
                                        setSelectedCourseId(next.id);
                                    }}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {selectedCourseId && activeCourse && activeCourse.subject_id ? (
                        <CourseHealthPanel
                            subjectId={activeCourse.subject_id}
                            subjectName={activeCourse.title_ar}
                        />
                    ) : (
                        <div className="bg-muted/30 border border-dashed border-border rounded-xl p-12 text-center">
                            <p className="text-muted-foreground">
                                {t('قم بإنشاء دورة مرتبطة بمادة لرؤية التحليلات', 'Create a course linked to a subject to see AI insights')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Quick Actions & Recent */}
                <div className="space-y-6">
                    <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
                        <h2 className="text-base font-bold text-foreground mb-4">
                            {t('إجراءات سريعة', 'Quick Actions')}
                        </h2>
                        <div className="grid grid-cols-1 gap-3">
                            <Button asChild variant="outline" className="justify-start h-11">
                                <Link to="/teacher/lessons">
                                    <Video className="w-4 h-4 me-3 text-primary" />
                                    {t('إضافة درس فيديو', 'Add Video Lesson')}
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="justify-start h-11">
                                <Link to="/teacher/quizzes/new">
                                    <Plus className="w-4 h-4 me-3 text-primary" />
                                    {t('إنشاء اختبار', 'Create Quiz')}
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
                        <h2 className="text-base font-bold text-foreground mb-4">
                            {t('دوراتك الأخيرة', 'Recent Courses')}
                        </h2>
                        <div className="space-y-3">
                            {courses.length > 0 ? (
                                courses.map(course => (
                                    <button
                                        key={course.id}
                                        onClick={() => setSelectedCourseId(course.id)}
                                        className={`w-full text-start px-3 py-2.5 rounded-lg border transition-all ${selectedCourseId === course.id
                                            ? 'border-primary bg-primary/5 text-primary font-medium'
                                            : 'border-border hover:bg-muted/50 text-muted-foreground'
                                            }`}
                                    >
                                        <div className="text-sm font-semibold truncate">
                                            {course.title_ar}
                                        </div>
                                        <div className="text-[10px] opacity-70 mt-0.5">
                                            {course.is_published ? t('منشورة', 'Published') : t('مسودة', 'Draft')}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    {t('لا توجد دورات حالياً', 'No courses yet')}
                                </p>
                            )}
                            <Button asChild variant="link" size="sm" className="w-full text-xs">
                                <Link to="/teacher/courses">
                                    {t('عرض الكل', 'View All')}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
