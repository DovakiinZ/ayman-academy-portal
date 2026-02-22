import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Course } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Video, Loader2, BookOpen, CreditCard } from 'lucide-react';

export default function MyCourses() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [stages, setStages] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);

    useEffect(() => {
        async function fetchData() {
            if (!user) return;
            setLoading(true);

            const [coursesRes, stagesRes, subjectsRes] = await Promise.all([
                supabase
                    .from('courses')
                    .select('*')
                    .eq('teacher_id', user.id)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('stages')
                    .select('*')
                    .order('sort_order'),
                supabase
                    .from('subjects')
                    .select('id, title_ar, title_en')
            ]);

            setCourses(coursesRes.data || []);
            setStages(stagesRes.data || []);
            setSubjects(subjectsRes.data || []);
            setLoading(false);
        }

        fetchData();
    }, [user]);

    const getStageTitle = (levelId: string) => {
        const stage = stages.find(s => s.id === levelId);
        if (!stage) return levelId;
        return t(stage.title_ar, stage.title_en || stage.title_ar);
    };

    const getSubjectTitle = (subjectId: string | null) => {
        if (!subjectId) return null;
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return null;
        return t(subject.title_ar, subject.title_en || subject.title_ar);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('دوراتي', 'My Courses')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('إدارة دوراتك ودروسك', 'Manage your courses and lessons')}
                    </p>
                </div>
                <Button asChild>
                    <Link to="/teacher/courses/new">
                        <Plus className="w-4 h-4 me-2" />
                        {t('دورة جديدة', 'New Course')}
                    </Link>
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : courses.length === 0 ? (
                <div className="bg-background rounded-lg border border-border p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                        {t('لم تقم بإنشاء أي دورات بعد', "You haven't created any courses yet")}
                    </p>
                    <Button asChild>
                        <Link to="/teacher/courses/new">
                            <Plus className="w-4 h-4 me-2" />
                            {t('إنشاء أول دورة', 'Create Your First Course')}
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => (
                        <div key={course.id} className="bg-background rounded-lg border border-border overflow-hidden">
                            {course.thumbnail_url ? (
                                <img src={course.thumbnail_url} alt="" className="w-full h-32 object-cover" />
                            ) : (
                                <div className="w-full h-32 bg-secondary flex items-center justify-center">
                                    <Video className="w-8 h-8 text-muted-foreground" />
                                </div>
                            )}
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="font-medium text-foreground line-clamp-2">{course.title_ar}</h3>
                                    <Badge variant={course.is_published ? 'default' : 'secondary'} className="shrink-0">
                                        {course.is_published ? t('منشور', 'Published') : t('مسودة', 'Draft')}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                                    <div className="flex items-center gap-1">
                                        <BookOpen className="w-3 h-3" />
                                        {getStageTitle(course.level_id)}
                                    </div>
                                    {getSubjectTitle(course.subject_id) && (
                                        <>
                                            <span>•</span>
                                            <span>{getSubjectTitle(course.subject_id)}</span>
                                        </>
                                    )}
                                </div>

                                {course.is_paid && (
                                    <div className="flex items-center gap-1 text-primary text-sm font-semibold mb-3">
                                        <CreditCard className="w-4 h-4" />
                                        <span>{course.price_amount} {t('ر.س', 'SAR')}</span>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Button asChild variant="outline" size="sm" className="flex-1">
                                        <Link to={`/teacher/courses/${course.id}`}>
                                            <Pencil className="w-3 h-3 me-1" />
                                            {t('تعديل', 'Edit')}
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline" size="sm" className="flex-1">
                                        <Link to={`/teacher/courses/${course.id}/lessons`}>
                                            <Video className="w-3 h-3 me-1" />
                                            {t('الدروس', 'Lessons')}
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
