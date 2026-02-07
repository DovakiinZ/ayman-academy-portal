import { useState, useEffect } from 'react';
import { Lesson, LessonQuiz, LessonQuizQuestion, QuizQuestionType } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, GripVertical, Check } from 'lucide-react';

interface LessonSettingsProps {
    lesson: Lesson;
    onUpdate: (data: Partial<Lesson>) => void;
}

export default function LessonSettings({ lesson, onUpdate }: LessonSettingsProps) {
    const { t } = useLanguage();
    const [localLesson, setLocalLesson] = useState(lesson);
    const [quiz, setQuiz] = useState<LessonQuiz | null>(null);
    const [questions, setQuestions] = useState<LessonQuizQuestion[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLocalLesson(lesson);
    }, [lesson]);

    useEffect(() => {
        fetchQuiz();
    }, [lesson.id]);

    const fetchQuiz = async () => {
        setLoading(true);
        const { data: quizData } = await supabase
            .from('lesson_quizzes')
            .select('*')
            .eq('lesson_id', lesson.id)
            .single();

        if (quizData) {
            setQuiz(quizData as any);
            const { data: qData } = await supabase
                .from('lesson_quiz_questions')
                .select('*')
                .eq('quiz_id', (quizData as any).id)
                .order('order_index');
            setQuestions((qData as any) || []);
        }
        setLoading(false);
    };

    const handleLessonChange = (field: keyof Lesson, value: any) => {
        setLocalLesson(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveLesson = async () => {
        try {
            await onUpdate(localLesson);
            toast.success(t('تم حفظ الإعدادات', 'Settings saved'));
        } catch (error) {
            toast.error(t('فشل الحفظ', 'Save failed'));
        }
    };

    const handleCreateQuiz = async () => {
        try {
            const { data, error } = await supabase.from('lesson_quizzes').insert({
                lesson_id: lesson.id,
                is_enabled: true,
                passing_score: 70,
                unlock_after_percent: 90
            } as any).select().single();

            if (error) throw error;
            setQuiz(data as any);
            toast.success(t('تم إنشاء الاختبار', 'Quiz created'));
        } catch (error) {
            toast.error(t('فشل إنشاء الاختبار', 'Failed to create quiz'));
        }
    };

    const handleAddQuestion = async () => {
        if (!quiz) return;
        try {
            const { data, error } = await supabase.from('lesson_quiz_questions').insert({
                quiz_id: quiz.id,
                type: 'mcq',
                question_ar: 'سؤال جديد',
                options: ['الخيار 1', 'الخيار 2'],
                correct_answer: 'الخيار 1',
                order_index: questions.length
            } as any).select().single();

            if (error) throw error;
            setQuestions([...questions, data as any]);
            toast.success(t('تم إضافة السؤال', 'Question added'));
        } catch (error) {
            toast.error(t('فشل إضافة السؤال', 'Failed to add question'));
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm(t('حذف السؤال؟', 'Delete question?'))) return;
        try {
            const { error } = await supabase.from('lesson_quiz_questions').delete().eq('id', id);
            if (error) throw error;
            setQuestions(questions.filter(q => q.id !== id));
            toast.success(t('تم حذف السؤال', 'Question deleted'));
        } catch (error) {
            toast.error(t('فشل حذف السؤال', 'Failed to delete question'));
        }
    };

    const handleUpdateQuestion = async (id: string, updates: Partial<LessonQuizQuestion>) => {
        // Optimistic update
        setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));

        try {
            const { error } = await supabase.from('lesson_quiz_questions').update(updates as any).eq('id', id);
            if (error) throw error;
        } catch (error) {
            toast.error(t('فشل التحديث', 'Update failed'));
            fetchQuiz(); // Revert
        }
    };

    return (
        <Tabs defaultValue="general" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="general">{t('عام', 'General')}</TabsTrigger>
                <TabsTrigger value="quiz">{t('الاختبار', 'Quiz')}</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label>{t('مدة الدرس (دقائق)', 'Duration (mins)')}</Label>
                    <Input
                        type="number"
                        value={localLesson.duration_minutes || ''}
                        onChange={e => handleLessonChange('duration_minutes', parseInt(e.target.value) || 0)}
                    />
                </div>
                <div className="space-y-2">
                    <Label>{t('رابط الفيديو الأصلي (يوتيوب)', 'Original Video URL')}</Label>
                    <Input
                        value={localLesson.video_url || ''}
                        onChange={e => handleLessonChange('video_url', e.target.value)}
                        placeholder="https://youtube.com/..."
                    />
                </div>
                <div className="flex items-center space-x-2 gap-2 mt-4">
                    <Switch
                        checked={localLesson.is_paid}
                        onCheckedChange={c => handleLessonChange('is_paid', c)}
                    />
                    <Label>{t('درس مدفوع', 'Paid Lesson')}</Label>
                </div>
                <div className="flex items-center space-x-2 gap-2">
                    <Switch
                        checked={localLesson.is_free_preview || false}
                        onCheckedChange={c => handleLessonChange('is_free_preview', c)}
                    />
                    <Label>{t('معاينة مجانية', 'Free Preview')}</Label>
                </div>

                <Button onClick={handleSaveLesson} className="w-full mt-4">
                    {t('حفظ التغييرات', 'Save Changes')}
                </Button>
            </TabsContent>

            <TabsContent value="quiz" className="space-y-4 pt-4">
                {!quiz ? (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">{t('لا يوجد اختبار لهذا الدرس', 'No quiz for this lesson')}</p>
                        <Button onClick={handleCreateQuiz} variant="outline">
                            <Plus className="w-4 h-4 me-2" />
                            {t('إنشاء اختبار', 'Create Quiz')}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h3 className="font-semibold">{t('أسئلة الاختبار', 'Quiz Questions')}</h3>
                            <Button size="sm" onClick={handleAddQuestion} variant="outline">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {questions.map((q, idx) => (
                                <QuestionEditor
                                    key={q.id}
                                    question={q}
                                    index={idx}
                                    onUpdate={(updates) => handleUpdateQuestion(q.id, updates)}
                                    onDelete={() => handleDeleteQuestion(q.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}

function QuestionEditor({
    question,
    index,
    onUpdate,
    onDelete
}: {
    question: LessonQuizQuestion,
    index: number,
    onUpdate: (data: Partial<LessonQuizQuestion>) => void,
    onDelete: () => void
}) {
    const { t } = useLanguage();

    return (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <div className="flex items-start gap-2">
                <span className="text-sm font-bold text-muted-foreground mt-2">#{index + 1}</span>
                <div className="flex-1 space-y-2">
                    <Input
                        value={question.question_ar}
                        onChange={e => onUpdate({ question_ar: e.target.value })}
                        placeholder={t('نص السؤال', 'Question Text')}
                        className="font-medium"
                    />
                </div>
                <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            <div className="pl-6 space-y-2">
                <Label className="text-xs text-muted-foreground">{t('الخيارات (افصل بينها بفاصلة)', 'Options (comma separated)')}</Label>
                <Input
                    value={Array.isArray(question.options) ? question.options.join(', ') : ''}
                    onChange={e => onUpdate({ options: e.target.value.split(',').map(s => s.trim()) })}
                    placeholder="Option 1, Option 2, Option 3"
                />

                <Label className="text-xs text-muted-foreground">{t('الإجابة الصحيحة', 'Correct Answer')}</Label>
                <Select
                    value={question.correct_answer as string}
                    onValueChange={v => onUpdate({ correct_answer: v })}
                >
                    <SelectTrigger className="h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.isArray(question.options) && question.options.map((opt: string) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
