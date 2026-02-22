/**
 * StudentDashboard — Rich, informative student dashboard
 *
 * Sections:
 * 1. Welcome + Continue Learning (hero card)
 * 2. My Subjects with progress bars
 * 3. Recent Lessons
 * 4. Progress Summary stats
 *
 * Uses React Query for cached data — instantly hydrated from localStorage.
 */

import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIMES } from '@/lib/queryConfig';
import { Lesson, Subject, Stage, LessonProgress } from '@/types/database';
import {
    BookOpen,
    Play,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle,
    TrendingUp,
    BookMarked,
    Award,
    Loader2,
    Trophy,
    GraduationCap,
    RefreshCw,
} from 'lucide-react';
import XPProgressBar from '@/components/student/XPProgressBar';
import StudentCoachWidget from '@/components/student/StudentCoachWidget';
import { Button } from '@/components/ui/button';

interface ContinueItem {
    progress: LessonProgress;
    lesson: Lesson & {
        subject: Subject & { stage: Stage };
    };
    videoUrl?: string;
}

interface SubjectProgress {
    subject: Subject & { stage: Stage };
    totalLessons: number;
    completedLessons: number;
    percent: number;
}

interface RecentLesson {
    lesson: Lesson & {
        subject: Subject;
    };
    progress: LessonProgress;
}

// Helper
const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export default function StudentDashboard() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const navigate = useNavigate();

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    // Single cached query for all dashboard data
    const { data: dashData, isLoading, isFetching } = useQuery<any>({
        queryKey: ['student-dashboard-full', profile?.id],
        queryFn: async () => {
            const userId = profile!.id;

            // 1. Fetch all progress for this user
            const { data: allProgress } = await supabase
                .from('lesson_progress')
                .select(`
                    *,
                    lesson:lessons(
                        *,
                        subject:subjects(
                            *,
                            stage:stages(*)
                        )
                    )
                `)
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            const progressItems = (allProgress || []) as any[];

            // 2. Continue Learning — most recent incomplete
            const lastIncomplete = progressItems.find(
                p => !p.completed_at && p.progress_percent > 0 && p.lesson
            );
            const continueItem: ContinueItem | null = lastIncomplete ? {
                progress: lastIncomplete,
                lesson: lastIncomplete.lesson,
                videoUrl: lastIncomplete.lesson.video_url ||
                    lastIncomplete.lesson.full_video_url ||
                    lastIncomplete.lesson.preview_video_url,
            } : null;

            // 3. Recent lessons (last 5)
            const recentLessons: RecentLesson[] = progressItems
                .filter(p => p.lesson)
                .slice(0, 5)
                .map(p => ({ lesson: p.lesson, progress: p }));

            // 4. Per-subject progress
            const { data: allSubjects } = await supabase
                .from('subjects')
                .select('*, stage:stages(*), lessons(id)')
                .eq('is_active', true)
                .order('sort_order');

            const completedIds = new Set(
                progressItems.filter(p => p.completed_at).map(p => p.lesson_id)
            );

            const subjectProgress: SubjectProgress[] = ((allSubjects || []) as any[])
                .map(s => {
                    const lessonIds: string[] = (s.lessons || []).map((l: any) => l.id);
                    const total = lessonIds.length;
                    const completed = lessonIds.filter(id => completedIds.has(id)).length;
                    return {
                        subject: { ...s, lessons: undefined },
                        totalLessons: total,
                        completedLessons: completed,
                        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
                    };
                })
                .filter(s => s.totalLessons > 0);

            // 5. Stats
            const completedCount = progressItems.filter(p => p.completed_at).length;
            const inProgressCount = progressItems.filter(p => !p.completed_at && p.progress_percent > 0).length;

            return {
                continueItem,
                recentLessons,
                subjectProgress,
                stats: {
                    completed: completedCount,
                    inProgress: inProgressCount,
                    totalSubjects: subjectProgress.length,
                },
            };
        },
        enabled: !!profile?.id,
        staleTime: STALE_TIMES.DYNAMIC,
    });

    const continueItem = dashData?.continueItem ?? null;
    const subjectProgress = dashData?.subjectProgress ?? [];
    const recentLessons = dashData?.recentLessons ?? [];
    const stats = dashData?.stats ?? { completed: 0, inProgress: 0, totalSubjects: 0 };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-12">
            {/* ===== WELCOME + CONTINUE LEARNING ===== */}
            {continueItem ? (
                <section className="premium-card bg-secondary/20 border-primary/10 overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary/70" />
                    <div className="p-8 lg:p-10">
                        <p className="text-xs font-bold tracking-widest uppercase text-primary/70 mb-2">
                            {t(`مرحباً ${profile?.full_name?.split(' ')[0] || ''}!`, `Welcome back, ${profile?.full_name?.split(' ')[0] || ''}!`)}
                        </p>
                        <h2 className="text-2xl font-black text-foreground mb-8">
                            {t('أكمل رحلتك التعليمية', 'Continue Your Learning Journey')}
                        </h2>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Thumbnail */}
                            {continueItem.videoUrl && (
                                <Link
                                    to={`/student/lesson/${continueItem.lesson.id}`}
                                    className="relative aspect-video lg:w-80 bg-secondary/20 rounded-2xl overflow-hidden flex-shrink-0 group shadow-lg ring-1 ring-border transition-transform hover:scale-[1.02]"
                                >
                                    {getYoutubeId(continueItem.videoUrl) ? (
                                        <img
                                            src={`https://img.youtube.com/vi/${getYoutubeId(continueItem.videoUrl)}/mqdefault.jpg`}
                                            alt=""
                                            className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-secondary/20 flex items-center justify-center">
                                            <Play className="w-12 h-12 text-muted-foreground/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-secondary/50">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${continueItem.progress.progress_percent}%` }}
                                        />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/20">
                                        <div className="w-14 h-14 rounded-full bg-background/95 flex items-center justify-center shadow-2xl">
                                            <Play className="w-6 h-6 text-primary fill-primary ms-1" />
                                        </div>
                                    </div>
                                </Link>
                            )}

                            {/* Info */}
                            <div className="flex-1 flex flex-col justify-center min-w-0">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="badge-premium">
                                        {t(
                                            continueItem.lesson.subject?.title_ar || '',
                                            continueItem.lesson.subject?.title_en || continueItem.lesson.subject?.title_ar || ''
                                        )}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        {t(
                                            continueItem.lesson.subject?.stage?.title_ar || '',
                                            continueItem.lesson.subject?.stage?.title_en || ''
                                        )}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-foreground mb-3 truncate leading-snug">
                                    {t(continueItem.lesson.title_ar, continueItem.lesson.title_en || continueItem.lesson.title_ar)}
                                </h3>

                                <div className="flex items-center gap-4 text-sm font-semibold text-muted-foreground mb-8">
                                    <span className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-muted-foreground/60" />
                                        {Math.floor(continueItem.progress.last_position_seconds / 60)} {t('دقيقة', 'min')}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span className="text-primary">{continueItem.progress.progress_percent}% {t('مكتمل', 'done')}</span>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <Link to={`/student/lesson/${continueItem.lesson.id}`}>
                                        <Button size="lg" className="h-12 px-8 gap-3 rounded-xl shadow-premium bg-primary hover:bg-primary/90 font-bold">
                                            <Play className="w-4 h-4 fill-current" />
                                            {t('متابعة الدرس', 'Continue Lesson')}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            ) : (
                /* Welcome banner for new students */
                <section className="premium-card p-10 lg:p-16 text-center border-primary/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary/70" />
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <div className="w-20 h-20 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-8">
                            <GraduationCap className="w-10 h-10 text-primary/70" />
                        </div>
                        <h1 className="text-3xl font-black text-foreground mb-4">
                            {t(
                                `مرحباً بك، ${profile?.full_name?.split(' ')[0] || ''}`,
                                `Welcome, ${profile?.full_name?.split(' ')[0] || ''}`
                            )}
                        </h1>
                        <p className="text-lg text-muted-foreground mb-10 leading-relaxed font-medium">
                            {t('ابدأ رحلتك التعليمية الآن باستعراض المواد المتاحة المصممة خصيصاً لمستواك الدراسي', 'Start your learning journey now by browsing subjects designed specifically for your level.')}
                        </p>
                        <Link to="/student/subjects">
                            <Button size="lg" className="h-14 px-10 rounded-2xl shadow-premium text-lg font-bold bg-primary hover:bg-primary/90">
                                {t('تصفح جميع المواد', 'Browse All Subjects')}
                            </Button>
                        </Link>
                    </div>
                </section>
            )}

            {/* ===== STATS SUMMARY ===== */}
            <section className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
                <div className="premium-card p-6 text-center bg-card">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4 border border-emerald-500/20">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <p className="text-3xl font-black text-foreground mb-1">{stats.completed}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('دروس مكتملة', 'Completed')}</p>
                </div>
                <div className="premium-card p-6 text-center bg-card">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-4 border border-blue-500/20">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <p className="text-3xl font-black text-foreground mb-1">{stats.inProgress}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('قيد المتابعة', 'In Progress')}</p>
                </div>
                <div className="premium-card p-6 text-center bg-card col-span-2 md:col-span-1 border-primary/5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-4 border border-primary/20">
                        <BookMarked className="w-6 h-6" />
                    </div>
                    <p className="text-3xl font-black text-foreground mb-1">{stats.totalSubjects}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('المواد المسجلة', 'Registered')}</p>
                </div>
            </section>

            {/* ===== XP & AI COACH ===== */}
            {profile?.id && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <XPProgressBar studentId={profile.id} />
                    <StudentCoachWidget />
                </section>
            )}

            {/* ===== MY SUBJECTS (top 6) ===== */}
            {subjectProgress.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black text-foreground">{t('موادي الأكاديمية', 'Academic Subjects')}</h2>
                        <Link to="/student/subjects" className="text-sm font-bold text-primary hover:text-primary/70 flex items-center gap-1 transition-colors">
                            {t('عرض جميع المواد', 'View All Subjects')}
                            <ChevronIcon className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjectProgress.slice(0, 6).map(sp => {
                            const isComplete = sp.percent === 100;
                            return (
                                <Link
                                    key={sp.subject.id}
                                    to={`/student/subjects/${sp.subject.id}`}
                                    className="premium-card p-6 flex flex-col group bg-card"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate text-base">
                                            {t(sp.subject.title_ar, sp.subject.title_en || sp.subject.title_ar)}
                                        </h3>
                                        {isComplete ? (
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center border border-border">
                                                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto">
                                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-3">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-primary/80'}`}
                                                style={{ width: `${sp.percent}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                            <span>{sp.completedLessons}/{sp.totalLessons} {t('درس مكتمل', 'lessons')}</span>
                                            <span className={isComplete ? 'text-emerald-600' : 'text-primary'}>{sp.percent}%</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ===== RECENT LESSONS ===== */}
            {recentLessons.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-8 mt-4">
                        <h2 className="text-2xl font-black text-foreground">{t('آخر الدروس المتابعة', 'Recent Lessons')}</h2>
                    </div>

                    <div className="grid gap-3">
                        {recentLessons.map(({ lesson, progress }) => {
                            const isCompleted = !!progress.completed_at;
                            return (
                                <Link
                                    key={lesson.id}
                                    to={`/student/lesson/${lesson.id}`}
                                    className="premium-card p-4 flex items-center gap-5 hover:border-primary/20 bg-card transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center flex-shrink-0 group-hover:bg-primary/5 transition-colors">
                                        {isCompleted ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <Play className="w-4 h-4 text-primary fill-primary ms-0.5" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-bold text-foreground group-hover:text-primary transition-colors truncate mb-0.5">
                                            {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                        </p>
                                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                                            {t(lesson.subject?.title_ar || '', lesson.subject?.title_en || '')}
                                        </p>
                                    </div>
                                    <div className="text-xs font-black text-muted-foreground flex-shrink-0">
                                        {isCompleted ? (
                                            <span className="text-emerald-600 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">{t('مُكتمل', 'Done')}</span>
                                        ) : (
                                            <span className="text-primary">{progress.progress_percent}%</span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
