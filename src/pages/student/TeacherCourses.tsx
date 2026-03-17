/**
 * TeacherCourses — Shows subjects/courses assigned to a specific teacher.
 * Accessed from the "Browse" button on the StudentTeachers page.
 */

import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIMES } from '@/lib/queryConfig';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    ArrowRight,
    Loader2,
    User,
    AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function useTeacherWithSubjects(teacherId: string | undefined) {
    return useQuery({
        queryKey: ['teacher-courses', teacherId],
        queryFn: async () => {
            // Fetch teacher profile
            const { data: teacher } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, email, bio_ar, bio_en')
                .eq('id', teacherId!)
                .single();

            // Fetch subjects where teacher_id matches
            const { data: subjectsByTeacher } = await supabase
                .from('subjects')
                .select('*, stage:stages(title_ar, title_en), lessons(id)')
                .eq('teacher_id', teacherId!)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            // Also fetch subjects via lessons created_by this teacher
            const { data: lessonSubjects } = await supabase
                .from('lessons')
                .select('subject_id')
                .eq('created_by', teacherId!)
                .eq('is_published', true);

            const subjectIds = new Set(
                (subjectsByTeacher || []).map((s: any) => s.id)
            );

            // Get unique subject IDs from lessons not already in subjectsByTeacher
            const extraSubjectIds = Array.from(
                new Set(
                    (lessonSubjects || [])
                        .map((l: any) => l.subject_id)
                        .filter((id: string) => id && !subjectIds.has(id))
                )
            );

            let extraSubjects: any[] = [];
            if (extraSubjectIds.length > 0) {
                const { data } = await supabase
                    .from('subjects')
                    .select('*, stage:stages(title_ar, title_en), lessons(id)')
                    .in('id', extraSubjectIds)
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });
                extraSubjects = data || [];
            }

            const allSubjects = [...(subjectsByTeacher || []), ...extraSubjects].map(
                (s: any) => ({
                    ...s,
                    lessons_count: s.lessons?.length || 0,
                })
            );

            return { teacher, subjects: allSubjects };
        },
        enabled: !!teacherId,
        staleTime: STALE_TIMES.SEMI_STATIC,
    });
}

export default function TeacherCourses() {
    const { teacherId } = useParams<{ teacherId: string }>();
    const navigate = useNavigate();
    const { t, direction } = useLanguage();

    const { data, isLoading } = useTeacherWithSubjects(teacherId);
    const teacher = data?.teacher;
    const subjects = data?.subjects || [];

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;
    const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!teacher) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                    {t('المعلم غير موجود', 'Teacher not found')}
                </h2>
                <Button variant="outline" onClick={() => navigate('/student/teachers')}>
                    <BackIcon className="w-4 h-4 me-2" />
                    {t('العودة للمعلمين', 'Back to teachers')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-start gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/student/teachers')}
                    className="shrink-0"
                >
                    <BackIcon className="w-4 h-4 me-1" />
                    {t('عودة', 'Back')}
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            {teacher.avatar_url ? (
                                <img
                                    src={teacher.avatar_url}
                                    alt={teacher.full_name || ''}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <User className="w-5 h-5 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">
                                {teacher.full_name || t('معلم', 'Teacher')}
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                {t('مواد المعلم', "Teacher's Courses")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subjects Grid */}
            {subjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.map((subject: any) => (
                        <Link
                            key={subject.id}
                            to={`/student/subjects/${subject.id}`}
                            className="group flex items-center gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all"
                        >
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                    {t(subject.title_ar, subject.title_en || subject.title_ar)}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {subject.stage && (
                                        <span className="text-xs text-muted-foreground">
                                            {t(subject.stage.title_ar, subject.stage.title_en || subject.stage.title_ar)}
                                        </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        {subject.lessons_count} {t('درس', 'lessons')}
                                    </span>
                                </div>
                            </div>
                            <ChevronIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="bg-background rounded-lg border border-border p-8 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-medium text-foreground mb-2">
                        {t('لا توجد مواد متاحة', 'No courses available')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t('لم يتم إضافة مواد لهذا المعلم بعد', 'No courses have been added by this teacher yet')}
                    </p>
                </div>
            )}
        </div>
    );
}
