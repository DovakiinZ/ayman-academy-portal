import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    ClipboardList,
    Search,
    Loader2,
    FileText,
    HelpCircle,
    ChevronRight,
    ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';

interface TeacherQuiz {
    id: string;
    lesson_id: string;
    is_enabled: boolean;
    passing_score: number;
    unlock_after_percent: number;
    created_at: string;
    lesson: {
        id: string;
        title_ar: string;
        title_en: string | null;
        subject: {
            title_ar: string;
            title_en: string | null;
        } | null;
    } | null;
    questions_count: number;
}

function useTeacherQuizzes(userId: string | undefined) {
    return useQuery({
        queryKey: ['teacher', userId, 'quizzes'],
        queryFn: async () => {
            // Get teacher's lesson IDs
            const { data: lessons } = await supabase
                .from('lessons')
                .select('id')
                .eq('created_by', userId!);

            if (!lessons || lessons.length === 0) return [];

            const lessonIds = lessons.map(l => l.id);

            // Get quizzes for those lessons
            const { data: quizzes, error } = await supabase
                .from('lesson_quizzes')
                .select(`
                    id, lesson_id, is_enabled, passing_score, unlock_after_percent, created_at,
                    lesson:lessons(id, title_ar, title_en, subject:subjects(title_ar, title_en)),
                    questions:lesson_quiz_questions(id)
                `)
                .in('lesson_id', lessonIds)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (quizzes || []).map((q: any) => ({
                ...q,
                questions_count: q.questions?.length || 0,
                questions: undefined,
            })) as TeacherQuiz[];
        },
        enabled: !!userId,
        staleTime: 3 * 60 * 1000,
    });
}

export default function TeacherQuizzes() {
    const { t, direction } = useLanguage();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: quizzes = [], isLoading } = useTeacherQuizzes(user?.id);

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    const filteredQuizzes = useMemo(() => {
        if (!searchQuery.trim()) return quizzes;
        const q = searchQuery.toLowerCase();
        return quizzes.filter(quiz =>
            quiz.lesson?.title_ar?.toLowerCase().includes(q) ||
            quiz.lesson?.title_en?.toLowerCase().includes(q) ||
            quiz.lesson?.subject?.title_ar?.toLowerCase().includes(q)
        );
    }, [quizzes, searchQuery]);

    const toggleQuiz = useMutation({
        mutationFn: async ({ quizId, enabled }: { quizId: string; enabled: boolean }) => {
            const { error } = await supabase
                .from('lesson_quizzes')
                .update({ is_enabled: enabled })
                .eq('id', quizId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher', user?.id, 'quizzes'] });
            toast.success(t('تم تحديث حالة الاختبار', 'Quiz status updated'));
        },
        onError: () => {
            toast.error(t('فشل في تحديث الاختبار', 'Failed to update quiz'));
        },
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('الاختبارات', 'Quizzes')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t(
                            `${quizzes.length} اختبار مرتبط بدروسك`,
                            `${quizzes.length} quizzes linked to your lessons`
                        )}
                    </p>
                </div>
            </div>

            {/* Search */}
            {quizzes.length > 3 && (
                <div className="mb-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('بحث في الاختبارات...', 'Search quizzes...')}
                            className="ps-9"
                        />
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : filteredQuizzes.length === 0 ? (
                <div className="bg-background rounded-lg border border-border p-12 text-center">
                    <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {searchQuery
                            ? t('لا توجد نتائج', 'No results found')
                            : t('لا توجد اختبارات بعد', 'No quizzes yet')
                        }
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {searchQuery
                            ? t('حاول تغيير البحث', 'Try a different search')
                            : t('يمكنك إضافة اختبارات من محرر الدروس', 'You can add quizzes from the lesson editor')
                        }
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredQuizzes.map((quiz) => (
                        <div
                            key={quiz.id}
                            className="bg-background rounded-lg border border-border p-4 flex items-center gap-4"
                        >
                            <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                                <ClipboardList className="w-5 h-5 text-primary" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-foreground text-sm truncate">
                                        {t(
                                            quiz.lesson?.title_ar || 'اختبار',
                                            quiz.lesson?.title_en || quiz.lesson?.title_ar || 'Quiz'
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    {quiz.lesson?.subject && (
                                        <span>
                                            {t(quiz.lesson.subject.title_ar, quiz.lesson.subject.title_en || quiz.lesson.subject.title_ar)}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <HelpCircle className="w-3 h-3" />
                                        {quiz.questions_count} {t('سؤال', 'questions')}
                                    </span>
                                    <span>
                                        {t('درجة النجاح:', 'Passing:')} {quiz.passing_score}%
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {quiz.is_enabled ? t('مفعّل', 'Active') : t('معطّل', 'Disabled')}
                                    </span>
                                    <Switch
                                        checked={quiz.is_enabled}
                                        onCheckedChange={(checked) =>
                                            toggleQuiz.mutate({ quizId: quiz.id, enabled: checked })
                                        }
                                    />
                                </div>
                                <Link to={`/teacher/lessons/${quiz.lesson_id}`}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <FileText className="w-4 h-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
