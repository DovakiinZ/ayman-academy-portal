/**
 * StudentLessons — Subject detail page with lesson list + progress
 * Shows subject title, overall progress bar, and ordered lesson list
 * with completion checkmarks and progress indicators.
 *
 * Uses React Query for cached data — instantly hydrated from localStorage.
 */

import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubjectDetail, useSubjectLessons, useSubjectTeachers } from '@/hooks/useAcademyData';
import { Lesson, LessonProgress } from '@/types/database';
import {
    Play,
    FileText,
    Lock,
    Clock,
    ArrowLeft,
    ArrowRight,
    Loader2,
    AlertCircle,
    BookOpen,
    CheckCircle,
    RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProgressMotivationBanner from '@/components/course/ProgressMotivationBanner';
import CertificateRequirements from '@/components/student/CertificateRequirements';

interface LessonWithProgress extends Lesson {
    progress?: LessonProgress;
}

export default function StudentLessons() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const { t, direction } = useLanguage();
    const { profile } = useAuth();

    // Cached queries
    const { data: subject, isLoading: subjectLoading } = useSubjectDetail(subjectId);
    const { data: lessonData, isLoading: lessonsLoading, isFetching } = useSubjectLessons(subjectId, profile?.id);
    const { data: teachers = [] } = useSubjectTeachers(subjectId);

    const isLoading = subjectLoading || lessonsLoading;

    // Merge lessons with progress
    const lessons: LessonWithProgress[] = useMemo(() => {
        if (!lessonData) return [];
        return lessonData.lessons.map((l: any) => ({
            ...l,
            progress: lessonData.progress.find((p: any) => p.lesson_id === l.id),
        }));
    }, [lessonData]);

    const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return null;
        const mins = Math.floor(seconds / 60);
        return `${mins} ${t('دقيقة', 'min')}`;
    };

    // Compute progress
    const completedCount = lessons.filter(l => l.progress?.completed_at).length;
    const totalCount = lessons.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Find "Continue" lesson
    const continueLesson = lessons.find(l => l.progress && !l.progress.completed_at && l.progress.progress_percent > 0)
        || lessons.find(l => !l.progress?.completed_at)
        || lessons[0];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!subject) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                    {t('المادة غير موجودة', 'Subject not found')}
                </h2>
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <BackIcon className="w-4 h-4 me-2" />
                    {t('العودة', 'Go back')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/student/subjects')}
                    className="shrink-0"
                >
                    <BackIcon className="w-4 h-4 me-1" />
                    {t('عودة', 'Back')}
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span>{t(subject.stage?.title_ar || '', subject.stage?.title_en || '')}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {t(subject.title_ar, subject.title_en || subject.title_ar)}
                    </h1>
                </div>
                {isFetching && !isLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        {t('جاري التحديث...', 'Updating...')}
                    </div>
                )}
            </div>

            {/* Motivational Progress Banner */}
            {totalCount > 0 && (
                <>
                    <ProgressMotivationBanner
                        progressPercent={progressPercent}
                        isCompleted={progressPercent === 100}
                        completedLessons={completedCount}
                        totalLessons={totalCount}
                        subjectId={subjectId}
                        onContinue={() => {
                            if (continueLesson) {
                                navigate(`/student/lesson/${continueLesson.id}`);
                            }
                        }}
                    />

                    {/* Teacher Info */}
                    {teachers.length > 0 && (
                        <div className="bg-background border border-border rounded-xl p-6 mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                                {t('المعلمون', 'Teachers')}
                            </h3>
                            <div className="flex flex-wrap gap-6">
                                {(teachers as any[]).map(teacher => (
                                    <div key={teacher.id} className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                                            {teacher.avatar_url ? (
                                                <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <BookOpen className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">{teacher.full_name}</p>
                                            <Link
                                                to={`/student/messages?teacher=${teacher.id}`}
                                                className="text-xs font-bold text-primary hover:underline"
                                            >
                                                {t('إرسال رسالة', 'Send Message')}
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Certificate Requirements Checklist */}
                    {subjectId && subject && (
                        <div id="certificate-requirements">
                            <CertificateRequirements
                                subjectId={subjectId}
                                subjectName={t(subject.title_ar, subject.title_en || subject.title_ar)}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Lessons List */}
            <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground mb-3">
                    {t('الدروس', 'Lessons')}
                </h2>
                {lessons.map((lesson, index) => {
                    const isCompleted = !!lesson.progress?.completed_at;
                    const hasProgress = (lesson.progress?.progress_percent || 0) > 0;
                    const isCurrent = continueLesson?.id === lesson.id && !isCompleted;

                    return (
                        <Link
                            key={lesson.id}
                            to={`/student/lesson/${lesson.id}`}
                            className={`group flex items-center gap-4 p-4 bg-background rounded-xl border transition-all ${isCurrent
                                ? 'border-primary/50 bg-primary/5 shadow-sm'
                                : 'border-border hover:border-primary/30 hover:shadow-sm'
                                }`}
                        >
                            {/* Status Icon */}
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                                {isCompleted ? (
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                ) : isCurrent ? (
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                        <Play className="w-4 h-4 text-primary-foreground fill-current ms-0.5" />
                                    </div>
                                ) : hasProgress ? (
                                    <div className="w-10 h-10 rounded-full border-2 border-primary/50 flex items-center justify-center">
                                        <span className="text-xs font-bold text-primary">{lesson.progress?.progress_percent}%</span>
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                        <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className={`font-medium transition-colors truncate ${isCurrent ? 'text-primary' : 'text-foreground group-hover:text-primary'
                                        }`}>
                                        {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                    </h3>
                                    {lesson.is_free_preview && (
                                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                                            {t('مجاني', 'Free')}
                                        </Badge>
                                    )}
                                    {lesson.is_paid && !lesson.is_free_preview && (
                                        <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    )}
                                </div>
                                {lesson.summary_ar && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                        {t(lesson.summary_ar, lesson.summary_en || lesson.summary_ar)}
                                    </p>
                                )}
                                <div className="flex items-center gap-3 mt-1">
                                    {lesson.duration_seconds && (
                                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {formatDuration(lesson.duration_seconds)}
                                        </span>
                                    )}
                                    {isCurrent && (
                                        <span className="text-[11px] text-primary font-medium">
                                            {t('التالي ▸', 'Next ▸')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Right icon */}
                            <div className="shrink-0">
                                {isCompleted ? (
                                    <span className="text-xs text-green-600 font-medium">{t('مكتمل', 'Done')}</span>
                                ) : lesson.full_video_url || lesson.preview_video_url || lesson.video_url ? (
                                    <Play className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                ) : (
                                    <FileText className="w-5 h-5 text-muted-foreground" />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Empty State */}
            {lessons.length === 0 && !isLoading && (
                <div className="bg-background rounded-xl border border-border p-8 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="font-medium text-foreground mb-2">
                        {t('لا توجد دروس متاحة', 'No lessons available')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t('سيتم إضافة الدروس قريباً', 'Lessons will be added soon')}
                    </p>
                </div>
            )}
        </div>
    );
}
