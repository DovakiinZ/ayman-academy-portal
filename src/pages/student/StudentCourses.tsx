import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Course, Profile } from '@/types/database';
import { BookOpen, User, ChevronLeft, ChevronRight } from 'lucide-react';

interface CourseWithTeacher extends Course {
    teacher: Profile;
    lessons_count: number;
}

export default function StudentCourses() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const [courses, setCourses] = useState<CourseWithTeacher[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.id) {
            fetchCourses();
        }
    }, [profile?.id]);

    const fetchCourses = async () => {
        if (!profile?.id) return;

        // Get accessible course IDs
        const { data: courseIds } = await supabase.rpc('get_student_courses', { p_user_id: profile.id });

        if (courseIds && courseIds.length > 0) {
            const { data: coursesData } = await supabase
                .from('courses')
                .select(`
                    *,
                    teacher:profiles(*),
                    lessons(count)
                `)
                .in('id', courseIds.map((c: { course_id: string }) => c.course_id))
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (coursesData) {
                setCourses(coursesData.map(c => ({
                    ...c,
                    lessons_count: c.lessons?.[0]?.count || 0
                })) as CourseWithTeacher[]);
            }
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('الدورات المتاحة', 'My Courses')}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {t('الدورات التي يمكنك الوصول إليها', 'Courses you have access to')}
                </p>
            </div>

            {courses.length === 0 ? (
                <div className="bg-background rounded-lg border border-border p-8 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-medium text-foreground mb-2">
                        {t('لا توجد دورات متاحة', 'No courses available')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t('اشترك في خطة للوصول إلى الدورات', 'Subscribe to a plan to access courses')}
                    </p>
                    <Link to="/plans" className="inline-block mt-4 text-primary hover:underline">
                        {t('تصفح الخطط', 'Browse Plans')}
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                        <Link
                            key={course.id}
                            to={`/student/course/${course.id}`}
                            className="bg-background rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow group"
                        >
                            {/* Cover */}
                            <div className="aspect-video bg-secondary/50 flex items-center justify-center">
                                {course.cover_image_url ? (
                                    <img
                                        src={course.cover_image_url}
                                        alt={course.title_ar}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <BookOpen className="w-12 h-12 text-muted-foreground" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                                    {t(course.title_ar, course.title_en || course.title_ar)}
                                </h3>

                                {course.description_ar && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                                        {t(course.description_ar, course.description_en || course.description_ar)}
                                    </p>
                                )}

                                {/* Teacher */}
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                                        <User className="w-3 h-3 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {course.teacher?.full_name || t('معلم', 'Teacher')}
                                    </span>
                                </div>

                                {/* Meta */}
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-xs text-muted-foreground">
                                        {course.lessons_count} {t('درس', 'lessons')}
                                    </span>
                                    <span className="text-xs text-primary flex items-center gap-1">
                                        {t('عرض الدورة', 'View Course')}
                                        <ChevronIcon className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
