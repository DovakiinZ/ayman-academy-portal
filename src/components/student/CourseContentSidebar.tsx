import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Lesson, LessonProgress } from '@/types/database';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle, Circle, Lock, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseContentSidebarProps {
    subjectId: string;
    currentLessonId: string;
    userId: string;
}

interface LessonItem extends Lesson {
    progress?: LessonProgress;
    isLocked: boolean;
}

export default function CourseContentSidebar({ subjectId, currentLessonId, userId }: CourseContentSidebarProps) {
    const { t } = useLanguage();
    const [lessons, setLessons] = useState<LessonItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (subjectId) fetchContent();
    }, [subjectId, userId]);

    const fetchContent = async () => {
        // 1. Fetch all lessons for the subject
        const { data: lessonsData } = await supabase
            .from('lessons')
            .select('*')
            .eq('subject_id', subjectId)
            .eq('is_published', true)
            .order('sort_order', { ascending: true })
            .returns<Lesson[]>();

        if (!lessonsData) return;

        // 2. Fetch user progress for these lessons
        const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('*')
            .eq('user_id', userId)
            .in('lesson_id', lessonsData.map(l => l.id));

        const merged: LessonItem[] = lessonsData.map(l => ({
            ...l,
            progress: progressData?.find(p => p.lesson_id === l.id),
            isLocked: false
        }));

        setLessons(merged);
        setLoading(false);
    };

    if (loading) return <div className="p-4 animate-pulse bg-muted h-96 rounded-lg"></div>;

    // Calculate course progress
    const completedCount = lessons.filter(l => l.progress?.completed_at).length;
    const totalCount = lessons.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div className="bg-background border border-border rounded-lg overflow-hidden flex flex-col h-full max-h-[calc(100vh-100px)]">
            <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{t('محتوى الدورة', 'Course Content')}</h3>
                    <span className="text-xs text-muted-foreground font-mono">
                        {completedCount}/{totalCount}
                    </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-right">{progressPercent}% {t('مكتمل', 'Completed')}</p>
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {lessons.map((lesson, index) => {
                    const isCurrent = lesson.id === currentLessonId;
                    const isCompleted = !!lesson.progress?.completed_at;
                    const isLocked = lesson.isLocked;

                    return (
                        <Link
                            key={lesson.id}
                            to={isLocked ? '#' : `/student/lesson/${lesson.id}`}
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-md transition-colors group relative",
                                isCurrent ? "bg-primary/10 border border-primary/20" : "hover:bg-accent",
                                isLocked && "opacity-50 cursor-not-allowed hover:bg-transparent"
                            )}
                        >
                            {/* Status Icon */}
                            <div className="mt-1 shrink-0">
                                {isCurrent ? (
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-pulse">
                                        <Play className="w-2.5 h-2.5 text-primary-foreground fill-current" />
                                    </div>
                                ) : isCompleted ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : isLocked ? (
                                    <Lock className="w-5 h-5 text-muted-foreground" />
                                ) : (
                                    <Circle className="w-5 h-5 text-muted-foreground" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className={cn(
                                    "text-sm font-medium leading-tight mb-1",
                                    isCurrent ? "text-primary" : "text-foreground"
                                )}>
                                    {index + 1}. {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {/* Duration removed until content_items logic is added */}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
