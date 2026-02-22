/**
 * MySubjects — Browse all subjects across stages with progress tracking
 * Uses React Query for cached data — instantly hydrated from localStorage.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMySubjects } from '@/hooks/useAcademyData';
import { Stage, Subject } from '@/types/database';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Loader2,
    CheckCircle,
    RefreshCw,
} from 'lucide-react';

interface SubjectWithProgress extends Subject {
    stage?: Stage;
    total_lessons: number;
    completed_lessons: number;
    progress_percent: number;
}

export default function MySubjects() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const { data: subjects = [], isLoading, isFetching } = useMySubjects(profile?.id);

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    // Group by stage
    const stages = useMemo(() => {
        const map = new Map<string, { stage: Stage; subjects: SubjectWithProgress[] }>();
        (subjects as SubjectWithProgress[]).forEach(s => {
            const stageId = s.stage_id;
            if (!map.has(stageId)) {
                map.set(stageId, { stage: s.stage!, subjects: [] });
            }
            map.get(stageId)!.subjects.push(s);
        });
        return map;
    }, [subjects]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('موادي الدراسية', 'My Subjects')}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('تصفح جميع المواد المتاحة وتابع تقدمك', 'Browse all available subjects and track your progress')}
                    </p>
                </div>
                {isFetching && !isLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        {t('جاري التحديث...', 'Updating...')}
                    </div>
                )}
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
            {subjects.length === 0 && !isLoading && (
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
