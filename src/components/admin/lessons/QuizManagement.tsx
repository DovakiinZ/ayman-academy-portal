import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lesson, Quiz, QuizQuestion } from '@/types/database';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
    Loader2, 
    Plus, 
    Trash2, 
    ChevronUp, 
    ChevronDown, 
    CheckCircle2, 
    Circle,
    Save,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizManagementProps {
    lesson: Lesson;
}

export default function QuizManagement({ lesson }: QuizManagementProps) {
    const { t } = useLanguage();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchQuiz();
    }, [lesson.id]);

    const fetchQuiz = async () => {
        try {
            setLoading(true);
            const { data: quizData, error: quizError } = await (supabase
                .from('quizzes' as any) as any)
                .select('*')
                .eq('lesson_id', lesson.id)
                .maybeSingle();

            if (quizError) throw quizError;

            if (quizData) {
                setQuiz(quizData);
                const { data: qData, error: qError } = await (supabase
                    .from('quiz_questions' as any) as any)
                    .select('*')
                    .eq('quiz_id', quizData.id)
                    .order('sort_order');
                
                if (qError) throw qError;
                setQuestions(qData || []);
            } else {
                setQuiz(null);
                setQuestions([]);
            }
        } catch (error) {
            console.error('Error fetching quiz:', error);
            toast.error(t('فشل تحميل الاختبار', 'Failed to load quiz'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateQuiz = async () => {
        try {
            setSaving(true);
            const { data, error } = await (supabase
                .from('quizzes' as any) as any)
                .insert({
                    lesson_id: lesson.id,
                    is_enabled: true,
                    passing_score: 70,
                    unlock_after_percent: 90
                })
                .select()
                .single();

            if (error) throw error;
            setQuiz(data);
            toast.success(t('تم إنشاء الاختبار بنجاح', 'Quiz created successfully'));
        } catch (error) {
            toast.error(t('فشل إنشاء الاختبار', 'Failed to create quiz'));
        } finally {
            setSaving(false);
        }
    };

    const handleAddQuestion = async () => {
        if (!quiz) return;
        try {
            setSaving(true);
            const newOrder = questions.length;
            const { data, error } = await (supabase
                .from('quiz_questions' as any) as any)
                .insert({
                    quiz_id: quiz.id,
                    lesson_id: lesson.id,
                    type: 'mcq',
                    question_ar: '',
                    options: [t('الخيار 1', 'Option 1'), t('الخيار 2', 'Option 2')],
                    correct_answer: t('الخيار 1', 'Option 1'),
                    sort_order: newOrder
                })
                .select()
                .single();

            if (error) throw error;
            setQuestions([...questions, data]);
            toast.success(t('تم إضافة سؤال جديد', 'New question added'));
        } catch (error) {
            toast.error(t('فشل إضافة السؤال', 'Failed to add question'));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm(t('هل أنت متأكد من حذف هذا السؤال؟', 'Are you sure you want to delete this question?'))) return;
        try {
            const { error } = await (supabase
                .from('quiz_questions' as any) as any)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            setQuestions(questions.filter(q => q.id !== id));
            toast.success(t('تم حذف السؤال', 'Question deleted'));
        } catch (error) {
            toast.error(t('فشل حذف السؤال', 'Failed to delete question'));
        }
    };

    const handleUpdateQuestion = async (id: string, updates: Partial<QuizQuestion>) => {
        // Optimistic UI update
        const oldQuestions = [...questions];
        setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));

        try {
            const { error } = await (supabase
                .from('quiz_questions' as any) as any)
                .update(updates)
                .eq('id', id);
            
            if (error) throw error;
        } catch (error) {
            setQuestions(oldQuestions);
            toast.error(t('فشل حفظ التعديلات', 'Failed to save changes'));
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">{t('جاري تحميل الاختبار...', 'Loading quiz...')}</p>
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed rounded-xl bg-muted/30">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('لا يوجد اختبار لهذا الدرس', 'No quiz for this lesson')}</h3>
                <p className="text-muted-foreground mb-6 max-w-xs">
                    {t('أضف اختباراً لتقييم فهم الطلاب للمحتوى التعليمي.', 'Add a quiz to assess students\' understanding of the lesson content.')}
                </p>
                <Button onClick={handleCreateQuiz} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    <Plus className="w-4 h-4 me-2" />
                    {t('إنشاء اختبار الآن', 'Create Quiz Now')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border p-4 rounded-lg">
                <div>
                    <h3 className="font-bold text-lg">{t('إدارة الاختبار', 'Quiz Management')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {questions.length} {t('سؤال تم إنشاؤه', 'questions created')}
                    </p>
                </div>
                <Button onClick={handleAddQuestion} size="sm" disabled={saving}>
                    <Plus className="w-4 h-4 me-2" />
                    {t('إضافة سؤال', 'Add Question')}
                </Button>
            </div>

            <div className="space-y-6">
                {questions.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                        {t('لا توجد أسئلة بعد. ابدأ بإضافة سؤالك الأول!', 'No questions yet. Start by adding your first question!')}
                    </div>
                ) : (
                    questions.map((q, idx) => (
                        <QuestionCard 
                            key={q.id}
                            question={q}
                            index={idx}
                            onUpdate={(updates) => handleUpdateQuestion(q.id, updates)}
                            onDelete={() => handleDeleteQuestion(q.id)}
                        />
                    ))
                )}
            </div>

            {questions.length > 0 && (
                <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={handleAddQuestion} disabled={saving} className="w-full max-w-md border-dashed border-2">
                        <Plus className="w-4 h-4 me-2" />
                        {t('إضافة سؤال آخر', 'Add Another Question')}
                    </Button>
                </div>
            )}
        </div>
    );
}

function QuestionCard({ 
    question, 
    index, 
    onUpdate, 
    onDelete 
}: { 
    question: QuizQuestion, 
    index: number,
    onUpdate: (updates: Partial<QuizQuestion>) => void,
    onDelete: () => void
}) {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    
    const handleOptionChange = (optIndex: number, newValue: string) => {
        const newOptions = [...(question.options || [])];
        const oldVal = newOptions[optIndex];
        newOptions[optIndex] = newValue;
        
        const updates: Partial<QuizQuestion> = { options: newOptions };
        
        // If the changed option was the correct one, update the correct answer too
        if (question.correct_answer === oldVal) {
            updates.correct_answer = newValue;
        }
        
        onUpdate(updates);
    };

    const handleAddOption = () => {
        const newOptions = [...(question.options || []), `Option ${question.options.length + 1}`];
        onUpdate({ options: newOptions });
    };

    const handleRemoveOption = (optIndex: number) => {
        if (question.options.length <= 2) {
            toast.error(t('يجب أن يكون هناك خياران على الأقل', 'Must have at least two options'));
            return;
        }
        const removedVal = question.options[optIndex];
        const newOptions = question.options.filter((_, i) => i !== optIndex);
        
        const updates: Partial<QuizQuestion> = { options: newOptions };
        
        // If we removed the correct answer, pick the first remaining one
        if (question.correct_answer === removedVal) {
            updates.correct_answer = newOptions[0];
        }
        
        onUpdate(updates);
    };

    return (
        <Card className="overflow-hidden border-2 focus-within:border-primary/50 transition-all duration-300">
            <CardHeader className="bg-muted/30 py-3 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">
                        {index + 1}
                    </span>
                    {t('سؤال', 'Question')}
                </CardTitle>
                <div className="flex items-center gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t('نص السؤال (عربي)', 'Question Text (AR)')}
                    </Label>
                    <Input 
                        value={question.question_ar || ''}
                        onChange={(e) => onUpdate({ question_ar: e.target.value })}
                        placeholder={t('اكتب سؤالك هنا...', 'Type your question here...')}
                        className="text-lg font-medium"
                        dir="rtl"
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {t('الخيارات والإجابة الصحيحة', 'Options & Correct Answer')}
                        </Label>
                        <span className="text-[10px] text-muted-foreground">
                            {t('اختر الدائرة بجانب الإجابة الصحيحة', 'Select the circle next to the correct answer')}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {(question.options || []).map((option: string, optIdx: number) => {
                            const isCorrect = question.correct_answer === option;
                            return (
                                <div key={optIdx} className="group flex items-center gap-3">
                                    <button
                                        onClick={() => onUpdate({ correct_answer: option })}
                                        className={cn(
                                            "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                            isCorrect 
                                                ? "bg-primary border-primary text-primary-foreground" 
                                                : "border-muted-foreground/30 hover:border-primary group-hover:bg-muted/50"
                                        )}
                                    >
                                        {isCorrect ? (
                                            <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                            <Circle className="w-3 h-3 text-transparent group-hover:text-muted-foreground/30" />
                                        )}
                                    </button>
                                    
                                    <div className="relative flex-1">
                                        <Input 
                                            value={option}
                                            onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                                            className={cn(
                                                "pr-10 h-10 transition-all",
                                                isCorrect && "border-primary/50 bg-primary/5 ring-1 ring-primary/20 font-medium"
                                            )}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                                            onClick={() => handleRemoveOption(optIdx)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleAddOption}
                        className="w-full border-dashed border h-9 text-muted-foreground hover:text-primary hover:border-primary"
                    >
                        <Plus className="w-3 h-3 me-2" />
                        {t('إضافة خيار جديد', 'Add New Option')}
                    </Button>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{t('يتم الحفظ تلقائياً', 'Auto-saving changes')}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
