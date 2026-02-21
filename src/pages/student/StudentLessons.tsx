/**
 * StudentLessons — Subject detail page with lesson list + progress
 * Shows subject title, overall progress bar, and ordered lesson list
 * with completion checkmarks and progress indicators.
 */

import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Subject, Lesson, LessonProgress } from '@/types/database';
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
    Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import ProgressMotivationBanner from '@/components/course/ProgressMotivationBanner';
import { issueCertificate } from '@/lib/certificateGenerator';

interface LessonWithProgress extends Lesson {
    progress?: LessonProgress;
}

export default function StudentLessons() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const { t, direction } = useLanguage();
    const { profile } = useAuth();

    const [subject, setSubject] = useState<(Subject & { stage?: any }) | null>(null);
    const [lessons, setLessons] = useState<LessonWithProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (subjectId && profile?.id) {
            fetchData();
        }
    }, [subjectId, profile?.id]);

    const fetchData = async () => {
        if (!subjectId || !profile?.id) return;

        try {
            setLoading(true);
            setError(null);

            // Fetch subject with stage info
            const { data: subjectData, error: subjectError } = await supabase
                .from('subjects')
                .select(`*, stage:stages(*)`)
                .eq('id', subjectId)
                .single();

            if (subjectError || !subjectData) {
                setError('Subject not found');
                return;
            }

            setSubject(subjectData as Subject & { stage?: any });

            // Fetch lessons for this subject
            const { data: lessonsData, error: lessonsError } = await supabase
                .from('lessons')
                .select('*')
                .eq('subject_id', subjectId)
                .eq('is_published', true)
                .order('order_index', { ascending: true });

            if (lessonsError) {
                console.error('[StudentLessons] Error fetching lessons:', lessonsError);
                setLessons([]);
                return;
            }

            const lessonsList = (lessonsData || []) as Lesson[];

            // Fetch user progress for these lessons
            if (lessonsList.length > 0) {
                const { data: progressData } = await supabase
                    .from('lesson_progress')
                    .select('*')
                    .eq('user_id', profile.id)
                    .in('lesson_id', lessonsList.map(l => l.id));

                const merged: LessonWithProgress[] = lessonsList.map(l => ({
                    ...l,
                    progress: ((progressData || []) as any[]).find(p => p.lesson_id === l.id),
                }));

                setLessons(merged);
            } else {
                setLessons([]);
            }
        } catch (err) {
            console.error('[StudentLessons] Error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

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

    // Find "Continue" lesson — first incomplete or first lesson
    const continueLesson = lessons.find(l => l.progress && !l.progress.completed_at && l.progress.progress_percent > 0)
        || lessons.find(l => !l.progress?.completed_at)
        || lessons[0];

    if (loading) {
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
            </div>

            {/* Motivational Progress Banner */}
            {totalCount > 0 && (
                <ProgressMotivationBanner
                    progressPercent={progressPercent}
                    isCompleted={progressPercent === 100}
                    completedLessons={completedCount}
                    totalLessons={totalCount}
                    onContinue={() => {
                        if (continueLesson) {
                            navigate(`/student/lesson/${continueLesson.id}`);
                        }
                    }}
                    onClaimCertificate={async () => {
                        if (!profile || !subjectId || !subject) return;
                        try {
                            const { certificate, error } = await issueCertificate({
                                studentId: profile.id,
                                studentName: profile.full_name || profile.email || 'طالب',
                                lessonId: lessons[0]?.id || '',
                                courseName: t(subject.title_ar, subject.title_en || subject.title_ar),
                                subjectName: t(subject.title_ar, subject.title_en || subject.title_ar),
                                subjectId: subjectId,
                                score: 100,
                            });
                            if (certificate) {
                                toast.success(t('🎉 تم إصدار الشهادة!', '🎉 Certificate issued!'));
                                navigate('/student/certificates');
                            } else if (error) {
                                toast.error(error);
                            }
                        } catch (err) {
                            console.error('Certificate claim error:', err);
                            toast.error(t('فشل إصدار الشهادة', 'Failed to issue certificate'));
                        }
                    }}
                />
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
            {lessons.length === 0 && !loading && (
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
