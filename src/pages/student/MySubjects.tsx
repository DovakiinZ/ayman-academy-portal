/**
 * MySubjects — Browse all subjects across stages with progress tracking
 * Replaces the Stages→Subjects two-step flow
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Stage, Subject } from '@/types/database';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Loader2,
    CheckCircle,
    Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubjectWithProgress extends Subject {
    stage?: Stage;
    total_lessons: number;
    completed_lessons: number;
    progress_percent: number;
    last_lesson_id?: string;
}

export default function MySubjects() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.id) fetchSubjects();
    }, [profile?.id]);

    const fetchSubjects = async () => {
        try {
            setLoading(true);

            // Fetch subjects with stage and lesson count
            const { data: subjectsData, error: subjectsError } = await supabase
                .from('subjects')
                .select(`
                    *,
                    stage:stages(*),
                    lessons(id)
                `)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (subjectsError || !subjectsData) {
                console.error('[MySubjects] Error:', subjectsError);
                setSubjects([]);
                return;
            }

            // Fetch all progress for this user
            const { data: progressData } = await supabase
                .from('lesson_progress')
                .select('lesson_id, completed_at')
                .eq('user_id', profile!.id);

            const completedLessonIds = new Set(
                ((progressData || []) as any[]).filter(p => p.completed_at).map(p => p.lesson_id)
            );

            const mapped: SubjectWithProgress[] = (subjectsData as any[]).map(s => {
                const lessonIds: string[] = (s.lessons || []).map((l: any) => l.id);
                const totalLessons = lessonIds.length;
                const completedLessons = lessonIds.filter(id => completedLessonIds.has(id)).length;
                const progressPercent = totalLessons > 0
                    ? Math.round((completedLessons / totalLessons) * 100)
                    : 0;

                return {
                    ...s,
                    lessons: undefined,
                    total_lessons: totalLessons,
                    completed_lessons: completedLessons,
                    progress_percent: progressPercent,
                };
            });

            setSubjects(mapped);
        } catch (err) {
            console.error('[MySubjects] Exception:', err);
            setSubjects([]);
        } finally {
            setLoading(false);
        }
    };

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    // Group by stage
    const stages = new Map<string, { stage: Stage; subjects: SubjectWithProgress[] }>();
    subjects.forEach(s => {
        const stageId = s.stage_id;
        if (!stages.has(stageId)) {
            stages.set(stageId, { stage: s.stage!, subjects: [] });
        }
        stages.get(stageId)!.subjects.push(s);
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">
                    {t('موادي الدراسية', 'My Subjects')}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {t('تصفح جميع المواد المتاحة وتابع تقدمك', 'Browse all available subjects and track your progress')}
                </p>
            </div>

            {/* Subjects grouped by stage */}
            {Array.from(stages.values()).map(({ stage, subjects: stageSubjects }) => (
                <section key={stage.id}>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-6 bg-primary rounded-full" />
                        <h2 className="text-lg font-semibold text-foreground">
                            {t(stage.title_ar, stage.title_en || stage.title_ar)}
                        </h2>
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                            {stageSubjects.length} {t('مادة', 'subjects')}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stageSubjects.map(subject => {
                            const isCompleted = subject.progress_percent === 100;
                            const hasStarted = subject.progress_percent > 0;

                            return (
                                <Link
                                    key={subject.id}
                                    to={`/student/subjects/${subject.id}`}
                                    className="group bg-background border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-lg transition-all duration-200"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate text-base">
                                                {t(subject.title_ar, subject.title_en || subject.title_ar)}
                                            </h3>
                                            {subject.description_ar && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {t(subject.description_ar || '', subject.description_en || subject.description_ar || '')}
                                                </p>
                                            )}
                                        </div>
                                        {isCompleted && (
                                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ms-2" />
                                        )}
                                    </div>

                                    {/* Progress */}
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                                            <span>{subject.completed_lessons}/{subject.total_lessons} {t('درس', 'lessons')}</span>
                                            <span className="font-medium">{subject.progress_percent}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${isCompleted
                                                    ? 'bg-green-500'
                                                    : hasStarted
                                                        ? 'bg-primary'
                                                        : 'bg-transparent'
                                                    }`}
                                                style={{ width: `${subject.progress_percent}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-xs font-medium text-primary">
                                            {isCompleted
                                                ? t('✓ مكتمل', '✓ Completed')
                                                : hasStarted
                                                    ? t('متابعة', 'Continue')
                                                    : t('ابدأ', 'Start')}
                                        </span>
                                        <ChevronIcon className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            ))}

            {/* Empty State */}
            {subjects.length === 0 && !loading && (
                <div className="bg-background rounded-xl border border-border p-12 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="font-medium text-foreground mb-2">
                        {t('لا توجد مواد متاحة', 'No subjects available')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t('سيتم إضافة المواد الدراسية قريباً', 'Subjects will be added soon')}
                    </p>
                </div>
            )}
        </div>
    );
}
