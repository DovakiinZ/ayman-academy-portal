import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { verifiedInsert, verifiedUpdate, verifiedDelete } from '@/lib/adminDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, Plus, Trash2, BrainCircuit, Save } from 'lucide-react';
import { toast } from 'sonner';

interface QuizEditorProps {
    lessonId: string;
    isOpen: boolean;
    onClose: () => void;
}

interface Question {
    id?: string;
    question_ar: string;
    question_en: string;
    type: 'mcq' | 'true_false';
    options: string[];
    correct_answer: number;
    explanation_ar: string;
    explanation_en: string;
    order_index: number;
}

export default function QuizEditor({ lessonId, isOpen, onClose }: QuizEditorProps) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [quizId, setQuizId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);

    useEffect(() => {
        if (isOpen && lessonId) {
            fetchQuiz();
        }
    }, [isOpen, lessonId]);

    const fetchQuiz = async () => {
        setLoading(true);
        try {
            // Get Quiz Data
            const { data: quiz } = await supabase
                .from('lesson_quizzes')
                .select('id')
                .eq('lesson_id', lessonId)
                .single() as any;

            if (quiz) {
                setQuizId(quiz.id);
                // Get Questions
                const { data: qData } = await supabase
                    .from('lesson_quiz_questions')
                    .select('*')
                    .eq('quiz_id', quiz.id)
                    .order('order_index', { ascending: true }) as any;

                setQuestions(qData || []);
            } else {
                setQuizId(null);
                setQuestions([]);
            }
        } catch (error) {
            console.error('Error loading quiz:', error);
            toast.error('فشل تحميل الاختبار');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateQuiz = async () => {
        setSaving(true);
        try {
            const result = await verifiedInsert(
                'lesson_quizzes',
                {
                    lesson_id: lessonId,
                    is_enabled: true,
                    passing_score: 50,
                    unlock_after_percent: 100
                },
                { successMessage: { ar: 'تم إنشاء الاختبار', en: 'Quiz created' } }
            );

            if (result.success && result.data) {
                setQuizId(result.data.id);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            {
                question_ar: '',
                question_en: '',
                type: 'mcq',
                options: ['', '', '', ''],
                correct_answer: 0,
                explanation_ar: '',
                explanation_en: '',
                order_index: questions.length + 1
            }
        ]);
    };

    const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    const handleUpdateOption = (qIndex: number, optIndex: number, value: string) => {
        const updated = [...questions];
        updated[qIndex].options[optIndex] = value;
        setQuestions(updated);
    };

    const handleSaveQuestion = async (index: number) => {
        if (!quizId) return;
        const q = questions[index];

        if (!q.question_ar) {
            toast.error(t('الرجاء إدخال نص السؤال', 'Please enter question text'));
            return;
        }

        setSaving(true);
        try {
            const payload = {
                quiz_id: quizId,
                lesson_id: lessonId,
                type: q.type,
                question_ar: q.question_ar,
                question_en: q.question_en,
                options: q.options,
                correct_answer: q.correct_answer,
                explanation_ar: q.explanation_ar,
                explanation_en: q.explanation_en,
                order_index: q.order_index
            };

            if (q.id) {
                await verifiedUpdate('lesson_quiz_questions', q.id, payload, {
                    successMessage: { ar: 'تم تحديث السؤال', en: 'Question updated' }
                });
            } else {
                const result = await verifiedInsert('lesson_quiz_questions', payload, {
                    successMessage: { ar: 'تم إضافة السؤال', en: 'Question added' }
                });

                if (result.success && result.data) {
                    const updated = [...questions];
                    updated[index] = result.data as unknown as Question;
                    setQuestions(updated);
                }
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteQuestion = async (index: number) => {
        const q = questions[index];
        if (q.id) {
            if (!confirm(t('هل أنت متأكد من حذف هذا السؤال؟', 'Are you sure you want to delete this question?'))) return;
            setSaving(true);
            await verifiedDelete('lesson_quiz_questions', q.id);
            setSaving(false);
        }
        const updated = questions.filter((_, i) => i !== index);
        setQuestions(updated);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('إدارة الاختبار', 'Manage Quiz')}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : !quizId ? (
                    <div className="text-center p-12 border-2 border-dashed rounded-xl">
                        <BrainCircuit className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">{t('لا يوجد اختبار لهذا الدرس', 'No quiz for this lesson')}</p>
                        <Button onClick={handleCreateQuiz} disabled={saving}>
                            <Plus className="w-4 h-4 me-2" />
                            {t('إنشاء اختبار', 'Create Quiz')}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="font-medium">{questions.length} {t('أسئلة', 'Questions')}</h3>
                            <Button size="sm" onClick={handleAddQuestion}><Plus className="w-4 h-4 me-2" /> {t('سؤال جديد', 'New Question')}</Button>
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                            {questions.map((q, idx) => (
                                <AccordionItem key={q.id || `new-${idx}`} value={`item-${idx}`}>
                                    <AccordionTrigger className="hover:no-underline">
                                        <span className="truncate max-w-[200px] text-start">
                                            {q.question_ar || t('سؤال جديد', 'New Question')}
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 bg-secondary/10 rounded-md space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('السؤال (عربي)', 'Question (AR)')}</Label>
                                                <Input value={q.question_ar} onChange={(e) => handleUpdateQuestion(idx, 'question_ar', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('السؤال (إنجليزي)', 'Question (EN)')}</Label>
                                                <Input value={q.question_en} onChange={(e) => handleUpdateQuestion(idx, 'question_en', e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>{t('الخيارات', 'Options')}</Label>
                                            {q.options.map((opt, optIdx) => (
                                                <div key={optIdx} className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name={`correct-${idx}`}
                                                        checked={q.correct_answer === optIdx}
                                                        onChange={() => handleUpdateQuestion(idx, 'correct_answer', optIdx)}
                                                        className="w-4 h-4"
                                                    />
                                                    <Input
                                                        value={opt}
                                                        onChange={(e) => handleUpdateOption(idx, optIdx, e.target.value)}
                                                        placeholder={`Option ${optIdx + 1}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('شرح الإجابة (عربي)', 'Explanation (AR)')}</Label>
                                                <Textarea value={q.explanation_ar} onChange={(e) => handleUpdateQuestion(idx, 'explanation_ar', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('شرح الإجابة (إنجليزي)', 'Explanation (EN)')}</Label>
                                                <Textarea value={q.explanation_en} onChange={(e) => handleUpdateQuestion(idx, 'explanation_en', e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteQuestion(idx)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" onClick={() => handleSaveQuestion(idx)} disabled={saving}>
                                                <Save className="w-4 h-4 me-2" />
                                                {t('حفظ السؤال', 'Save Question')}
                                            </Button>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
