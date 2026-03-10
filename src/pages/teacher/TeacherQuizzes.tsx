import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ClipboardList,
    Search,
    Loader2,
    FileText,
    HelpCircle,
    ChevronRight,
    ChevronLeft,
    Plus,
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

interface LessonOption {
    id: string;
    title_ar: string;
    title_en: string | null;
    subject: { title_ar: string; title_en: string | null } | null;
}

function useTeacherLessonsWithoutQuiz(userId: string | undefined, quizLessonIds: string[]) {
    return useQuery({
        queryKey: ['teacher', userId, 'lessons-no-quiz', quizLessonIds],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('lessons')
                .select('id, title_ar, title_en, subject:subjects(title_ar, title_en)')
                .eq('created_by', userId!)
                .order('title_ar', { ascending: true });
            if (error) throw error;
            const lessons = (data || []) as any[];
            return lessons
                .filter(l => !quizLessonIds.includes(l.id))
                .map(l => ({
                    id: l.id,
                    title_ar: l.title_ar,
                    title_en: l.title_en,
                    subject: l.subject,
                })) as LessonOption[];
        },
        enabled: !!userId,
        staleTime: 2 * 60 * 1000,
    });
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
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [quizForm, setQuizForm] = useState({
        lesson_id: '',
        passing_score: '70',
        unlock_after_percent: '0',
    });

    const { data: quizzes = [], isLoading } = useTeacherQuizzes(user?.id);
    const quizLessonIds = quizzes.map(q => q.lesson_id);
    const { data: lessonsWithoutQuiz = [] } = useTeacherLessonsWithoutQuiz(user?.id, quizLessonIds);

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

    const handleCreateQuiz = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quizForm.lesson_id) {
            toast.error(t('يرجى اختيار درس', 'Please select a lesson'));
            return;
        }

        const passingScore = parseInt(quizForm.passing_score);
        if (isNaN(passingScore) || passingScore < 0 || passingScore > 100) {
            toast.error(t('درجة النجاح يجب أن تكون بين 0 و 100', 'Passing score must be between 0 and 100'));
            return;
        }

        setCreating(true);
        try {
            const { error } = await supabase.from('lesson_quizzes').insert({
                lesson_id: quizForm.lesson_id,
                is_enabled: true,
                passing_score: passingScore,
                unlock_after_percent: parseInt(quizForm.unlock_after_percent) || 0,
            });

            if (error) throw error;

            toast.success(t('تم إنشاء الاختبار بنجاح. يمكنك إضافة الأسئلة من محرر الدرس.', 'Quiz created. Add questions from the lesson editor.'));
            queryClient.invalidateQueries({ queryKey: ['teacher', user?.id, 'quizzes'] });
            setCreateOpen(false);
            setQuizForm({ lesson_id: '', passing_score: '70', unlock_after_percent: '0' });
        } catch (err: any) {
            toast.error(t('فشل في إنشاء الاختبار', 'Failed to create quiz'), {
                description: err.message,
            });
        } finally {
            setCreating(false);
        }
    };

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
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="w-4 h-4 me-2" />
                    {t('اختبار جديد', 'New Quiz')}
                </Button>
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

            {/* Create Quiz Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('إنشاء اختبار جديد', 'Create New Quiz')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateQuiz} className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label>{t('الدرس', 'Lesson')} <span className="text-destructive">*</span></Label>
                            {lessonsWithoutQuiz.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">
                                    {t(
                                        'جميع دروسك لديها اختبارات بالفعل، أو لم تقم بإنشاء دروس بعد.',
                                        'All your lessons already have quizzes, or you have no lessons yet.'
                                    )}
                                </p>
                            ) : (
                                <Select
                                    value={quizForm.lesson_id}
                                    onValueChange={(v) => setQuizForm({ ...quizForm, lesson_id: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('اختر درسًا', 'Select a lesson')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {lessonsWithoutQuiz.map((lesson) => (
                                            <SelectItem key={lesson.id} value={lesson.id}>
                                                <span>
                                                    {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                                    {lesson.subject && (
                                                        <span className="text-muted-foreground ms-1">
                                                            — {t(lesson.subject.title_ar, lesson.subject.title_en || lesson.subject.title_ar)}
                                                        </span>
                                                    )}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('درجة النجاح (%)', 'Passing Score (%)')}</Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={quizForm.passing_score}
                                onChange={(e) => setQuizForm({ ...quizForm, passing_score: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('افتح بعد إكمال (%) من الدرس', 'Unlock after (%) of lesson')}</Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={quizForm.unlock_after_percent}
                                onChange={(e) => setQuizForm({ ...quizForm, unlock_after_percent: e.target.value })}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t(
                                'بعد الإنشاء، يمكنك إضافة الأسئلة من محرر الدرس.',
                                'After creating, add questions from the lesson editor.'
                            )}
                        </p>
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={creating || !quizForm.lesson_id || lessonsWithoutQuiz.length === 0}
                            >
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    <>
                                        <Plus className="w-4 h-4 me-2" />
                                        {t('إنشاء', 'Create')}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
