import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Subject, Lesson } from '@/types/database';
import { Play, FileText, Lock, Clock, ArrowLeft, ArrowRight, Loader2, AlertCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { dummyLessons } from '@/data/dummy';

export default function StudentLessons() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const { t, direction } = useLanguage();

    const [subject, setSubject] = useState<Subject | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDummy, setIsDummy] = useState(false);

    useEffect(() => {
        if (subjectId) {
            fetchData();
        }
    }, [subjectId]);

    const fetchData = async () => {
        if (!subjectId) return;

        try {
            setLoading(true);
            setError(null);

            // Fetch subject with stage info
            const { data: subjectData, error: subjectError } = await supabase
                .from('subjects')
                .select(`
                    *,
                    stage:stages(*)
                `)
                .eq('id', subjectId)
                .single();

            if (subjectError || !subjectData) {
                setError('Subject not found');
                setIsDummy(true);
                return;
            }

            setSubject(subjectData as Subject);

            // Fetch lessons for this subject (new subject_id based query)
            const { data: lessonsData, error: lessonsError } = await supabase
                .from('lessons')
                .select('*')
                .eq('subject_id', subjectId)
                .eq('is_published', true)
                .order('order_index', { ascending: true });

            if (lessonsError) {
                console.error('[StudentLessons] Error fetching lessons:', lessonsError);
                // Fallback to dummy data
                setLessons(dummyLessons as unknown as Lesson[]);
                setIsDummy(true);
            } else {
                setLessons(lessonsData as Lesson[] || []);
                setIsDummy(false);
            }
        } catch (err) {
            console.error('[StudentLessons] Error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setIsDummy(true);
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
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-start gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="shrink-0"
                >
                    <BackIcon className="w-4 h-4 me-1" />
                    {t('عودة', 'Back')}
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span>{t(subject.stage?.title_ar || '', subject.stage?.title_en || '')}</span>
                        <span>•</span>
                        <span>{t(subject.title_ar, subject.title_en || subject.title_ar)}</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('الدروس', 'Lessons')}
                    </h1>
                </div>
            </div>

            {/* Demo Data Badge */}
            {isDummy && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                    {t('يتم عرض بيانات تجريبية', 'Showing demo data')}
                </div>
            )}

            {/* Lessons List */}
            <div className="space-y-3">
                {lessons.map((lesson, index) => (
                    <Link
                        key={lesson.id}
                        to={`/student/lesson/${lesson.id}`}
                        className="group flex items-center gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all"
                    >
                        {/* Order Number */}
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                            {index + 1}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                    {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                </h3>
                                {lesson.is_free_preview && (
                                    <Badge variant="secondary" className="shrink-0">
                                        {t('مجاني', 'Free')}
                                    </Badge>
                                )}
                                {lesson.is_paid && !lesson.is_free_preview && (
                                    <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                )}
                            </div>
                            {lesson.summary_ar && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                    {t(lesson.summary_ar, lesson.summary_en || lesson.summary_ar)}
                                </p>
                            )}
                            {lesson.duration_seconds && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDuration(lesson.duration_seconds)}</span>
                                </div>
                            )}
                        </div>

                        {/* Icon */}
                        <div className="shrink-0">
                            {lesson.full_video_url || lesson.preview_video_url ? (
                                <Play className="w-5 h-5 text-primary" />
                            ) : (
                                <FileText className="w-5 h-5 text-muted-foreground" />
                            )}
                        </div>
                    </Link>
                ))}
            </div>

            {/* Empty State */}
            {lessons.length === 0 && !loading && (
                <div className="bg-background rounded-lg border border-border p-8 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
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
