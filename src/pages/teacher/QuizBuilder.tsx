import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { TranslationButton } from '@/components/admin/TranslationButton';
import type { Quiz, QuizQuestion, QuestionType, Course, Lesson } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Loader2,
    ChevronLeft,
    ChevronRight,
    Save,
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    GripVertical,
    Check,
    X,
    FileText,
    BookOpen,
    AlertCircle,
} from 'lucide-react';

// Step indicator component
function StepIndicator({ currentStep, steps }: { currentStep: number; steps: string[] }) {
    return (
        <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                    <div
                        className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                            ${index < currentStep
                                ? 'bg-primary text-primary-foreground'
                                : index === currentStep
                                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                                    : 'bg-secondary text-muted-foreground'
                            }
                        `}
                    >
                        {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    {index < steps.length - 1 && (
                        <div
                            className={`w-12 h-0.5 mx-2 ${index < currentStep ? 'bg-primary' : 'bg-border'
                                }`}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

// Question type labels
const questionTypeLabels = {
    mcq: { ar: 'اختيار من متعدد', en: 'Multiple Choice' },
    true_false: { ar: 'صح أو خطأ', en: 'True / False' },
    multi_select: { ar: 'اختيار متعدد', en: 'Multi-Select' },
    image_choice: { ar: 'اختيار صورة', en: 'Image Choice' },
};

interface QuestionForm {
    id?: string;
    question_type: QuestionType;
    question_text_ar: string;
    question_text_en: string;
    explanation_ar: string;
    explanation_en: string;
    points: number;
    options: {
        id?: string;
        option_text_ar: string;
        option_text_en: string;
        is_correct: boolean;
    }[];
}

const emptyQuestion: QuestionForm = {
    question_type: 'mcq',
    question_text_ar: '',
    question_text_en: '',
    explanation_ar: '',
    explanation_en: '',
    points: 1,
    options: [
        { option_text_ar: '', option_text_en: '', is_correct: false },
        { option_text_ar: '', option_text_en: '', is_correct: false },
    ],
};

export default function QuizBuilder() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const navigate = useNavigate();
    const { quizId } = useParams<{ quizId: string }>();
    const isEditing = !!quizId;
    const mountedRef = useRef(true);

    // Step management
    const [currentStep, setCurrentStep] = useState(0);
    const steps = [
        t('الربط', 'Attachment'),
        t('الأساسيات', 'Basics'),
        t('الأسئلة', 'Questions'),
        t('النشر', 'Publish'),
    ];

    // Loading states
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loadingLessons, setLoadingLessons] = useState(false);

    // Quiz form state
    const [form, setForm] = useState({
        attachment_type: 'lesson' as 'lesson' | 'course',
        course_id: '',
        lesson_id: '',
        title_ar: '',
        title_en: '',
        is_enabled: true,
        is_required: false,
        is_published: false,
        attempts_allowed: 0,
        show_answers_after_submit: true,
        passing_score_percent: null as number | null,
        time_limit_minutes: null as number | null,
        randomize_questions: false,
    });

    const { isTranslating: titleTranslating } = useAutoTranslate(
        form.title_ar, 'ar', 'en',
        (text) => setForm(f => ({ ...f, title_en: text }))
    );

    // Questions state
    const [questions, setQuestions] = useState<QuestionForm[]>([]);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuestionForm | null>(null);
    const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

    // Cleanup
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Fetch teacher's courses
    useEffect(() => {
        if (!profile?.id) return;

        supabase
            .from('courses')
            .select('id, title_ar, title_en')
            .eq('teacher_id', profile.id)
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                if (data && mountedRef.current) {
                    setCourses(data as Course[]);
                }
            });
    }, [profile?.id]);

    // Fetch lessons when course changes
    useEffect(() => {
        if (!form.course_id) {
            setLessons([]);
            return;
        }

        setLoadingLessons(true);
        supabase
            .from('lessons')
            .select('id, title_ar, title_en, order_index')
            .eq('course_id', form.course_id)
            .order('order_index', { ascending: true })
            .then(({ data }) => {
                if (mountedRef.current) {
                    setLessons(data as Lesson[] || []);
                    setLoadingLessons(false);
                }
            });
    }, [form.course_id]);

    // Fetch existing quiz if editing
    useEffect(() => {
        if (!isEditing || !quizId) return;

        const fetchQuiz = async () => {
            setLoading(true);

            // Fetch quiz
            const { data: quizData } = await supabase
                .from('quizzes')
                .select('*')
                .eq('id', quizId)
                .single();

            if (quizData && mountedRef.current) {
                setForm({
                    attachment_type: quizData.attachment_type,
                    course_id: quizData.course_id || '',
                    lesson_id: quizData.lesson_id || '',
                    title_ar: quizData.title_ar,
                    title_en: quizData.title_en || '',
                    is_enabled: quizData.is_enabled,
                    is_required: quizData.is_required,
                    is_published: quizData.is_published,
                    attempts_allowed: quizData.attempts_allowed,
                    show_answers_after_submit: quizData.show_answers_after_submit,
                    passing_score_percent: quizData.passing_score_percent,
                    time_limit_minutes: quizData.time_limit_minutes,
                    randomize_questions: quizData.randomize_questions,
                });

                // For lesson quiz, get course_id from lesson
                if (quizData.attachment_type === 'lesson' && quizData.lesson_id) {
                    const { data: lessonData } = await supabase
                        .from('lessons')
                        .select('course_id')
                        .eq('id', quizData.lesson_id)
                        .single();
                    if (lessonData) {
                        setForm(prev => ({ ...prev, course_id: lessonData.course_id }));
                    }
                }

                // Fetch questions
                const { data: questionsData } = await supabase
                    .from('quiz_questions')
                    .select(`
                        *,
                        options:quiz_options(*)
                    `)
                    .eq('quiz_id', quizId)
                    .order('order_index', { ascending: true });

                if (questionsData && mountedRef.current) {
                    setQuestions(questionsData.map(q => ({
                        id: q.id,
                        question_type: q.question_type,
                        question_text_ar: q.question_text_ar,
                        question_text_en: q.question_text_en || '',
                        explanation_ar: q.explanation_ar || '',
                        explanation_en: q.explanation_en || '',
                        points: q.points,
                        options: (q.options || []).map((opt: any) => ({
                            id: opt.id,
                            option_text_ar: opt.option_text_ar,
                            option_text_en: opt.option_text_en || '',
                            is_correct: opt.is_correct,
                        })),
                    })));
                }
            }

            if (mountedRef.current) setLoading(false);
        };

        fetchQuiz();
    }, [isEditing, quizId]);

    // Navigation
    const canGoNext = () => {
        switch (currentStep) {
            case 0: // Attachment
                if (form.attachment_type === 'lesson') {
                    return !!form.course_id && !!form.lesson_id;
                }
                return !!form.course_id;
            case 1: // Basics
                return !!form.title_ar.trim();
            case 2: // Questions
                return questions.length > 0;
            default:
                return true;
        }
    };

    const goNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const goBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Question management
    const openAddQuestion = () => {
        setEditingQuestion({ ...emptyQuestion });
        setEditingQuestionIndex(null);
        setShowQuestionModal(true);
    };

    const openEditQuestion = (index: number) => {
        setEditingQuestion({ ...questions[index] });
        setEditingQuestionIndex(index);
        setShowQuestionModal(true);
    };

    const saveQuestion = () => {
        if (!editingQuestion || !editingQuestion.question_text_ar.trim()) return;

        // Validate at least one correct answer
        const hasCorrect = editingQuestion.options.some(o => o.is_correct);
        if (!hasCorrect) {
            alert(t('يجب تحديد إجابة صحيحة واحدة على الأقل', 'Please mark at least one correct answer'));
            return;
        }

        if (editingQuestionIndex !== null) {
            // Update existing
            const updated = [...questions];
            updated[editingQuestionIndex] = editingQuestion;
            setQuestions(updated);
        } else {
            // Add new
            setQuestions([...questions, editingQuestion]);
        }

        setShowQuestionModal(false);
        setEditingQuestion(null);
        setEditingQuestionIndex(null);
    };

    const deleteQuestion = (index: number) => {
        if (!confirm(t('هل أنت متأكد من حذف هذا السؤال؟', 'Delete this question?'))) return;
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const moveQuestion = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= questions.length) return;
        const updated = [...questions];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        setQuestions(updated);
    };

    // Save quiz
    const saveQuiz = async (publish: boolean) => {
        if (!profile?.id) return;

        setSaving(true);

        try {
            const quizPayload = {
                created_by: profile.id,
                attachment_type: form.attachment_type,
                lesson_id: form.attachment_type === 'lesson' ? form.lesson_id : null,
                course_id: form.attachment_type === 'course' ? form.course_id : null,
                title_ar: form.title_ar,
                title_en: form.title_en || null,
                is_enabled: form.is_enabled,
                is_required: form.is_required,
                is_published: publish,
                attempts_allowed: form.attempts_allowed,
                show_answers_after_submit: form.show_answers_after_submit,
                passing_score_percent: form.passing_score_percent,
                time_limit_minutes: form.time_limit_minutes,
                randomize_questions: form.randomize_questions,
            };

            let savedQuizId = quizId;

            if (isEditing && quizId) {
                // Update quiz
                await supabase
                    .from('quizzes')
                    .update(quizPayload)
                    .eq('id', quizId);

                // Delete old questions (cascade deletes options)
                await supabase
                    .from('quiz_questions')
                    .delete()
                    .eq('quiz_id', quizId);
            } else {
                // Create new quiz
                const { data: newQuiz } = await supabase
                    .from('quizzes')
                    .insert(quizPayload)
                    .select('id')
                    .single();

                if (newQuiz) {
                    savedQuizId = newQuiz.id;
                }
            }

            // Insert questions
            if (savedQuizId && questions.length > 0) {
                for (let i = 0; i < questions.length; i++) {
                    const q = questions[i];
                    const { data: savedQuestion } = await supabase
                        .from('quiz_questions')
                        .insert({
                            quiz_id: savedQuizId,
                            question_type: q.question_type,
                            question_text_ar: q.question_text_ar,
                            question_text_en: q.question_text_en || null,
                            explanation_ar: q.explanation_ar || null,
                            explanation_en: q.explanation_en || null,
                            points: q.points,
                            order_index: i,
                        })
                        .select('id')
                        .single();

                    // Insert options
                    if (savedQuestion && q.options.length > 0) {
                        await supabase.from('quiz_options').insert(
                            q.options.map((opt, idx) => ({
                                question_id: savedQuestion.id,
                                option_text_ar: opt.option_text_ar,
                                option_text_en: opt.option_text_en || null,
                                is_correct: opt.is_correct,
                                order_index: idx,
                            }))
                        );
                    }
                }
            }

            navigate('/teacher/quizzes');
        } catch (err) {
            console.error('Save error:', err);
            alert(t('حدث خطأ أثناء الحفظ', 'Error saving quiz'));
        } finally {
            setSaving(false);
        }
    };

    // Loading
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;
    const NextIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">
                    {isEditing ? t('تعديل الاختبار', 'Edit Quiz') : t('إنشاء اختبار جديد', 'Create New Quiz')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {steps[currentStep]}
                </p>
            </div>

            {/* Step indicator */}
            <StepIndicator currentStep={currentStep} steps={steps} />

            {/* Step content */}
            <div className="bg-background rounded-lg border border-border p-6 mb-6">
                {/* Step 0: Attachment */}
                {currentStep === 0 && (
                    <div className="space-y-6">
                        <div>
                            <Label className="text-base font-medium mb-4 block">
                                {t('ربط الاختبار بـ:', 'Attach quiz to:')}
                            </Label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, attachment_type: 'lesson', lesson_id: '' })}
                                    className={`
                                        p-4 rounded-lg border-2 text-start transition-colors
                                        ${form.attachment_type === 'lesson'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                        }
                                    `}
                                >
                                    <FileText className={`w-6 h-6 mb-2 ${form.attachment_type === 'lesson' ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <p className="font-medium">{t('درس', 'Lesson')}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('اختبار بعد انتهاء الدرس', 'Quiz after lesson completion')}
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, attachment_type: 'course', lesson_id: '' })}
                                    className={`
                                        p-4 rounded-lg border-2 text-start transition-colors
                                        ${form.attachment_type === 'course'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                        }
                                    `}
                                >
                                    <BookOpen className={`w-6 h-6 mb-2 ${form.attachment_type === 'course' ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <p className="font-medium">{t('دورة', 'Course')}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('اختبار نهائي للدورة', 'Final course exam')}
                                    </p>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>{t('الدورة', 'Course')} *</Label>
                                <Select
                                    value={form.course_id}
                                    onValueChange={(v) => setForm({ ...form, course_id: v, lesson_id: '' })}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder={t('اختر الدورة', 'Select course')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courses.map((course) => (
                                            <SelectItem key={course.id} value={course.id}>
                                                {t(course.title_ar, course.title_en || course.title_ar)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {form.attachment_type === 'lesson' && form.course_id && (
                                <div>
                                    <Label>{t('الدرس', 'Lesson')} *</Label>
                                    <Select
                                        value={form.lesson_id}
                                        onValueChange={(v) => setForm({ ...form, lesson_id: v })}
                                        disabled={loadingLessons}
                                    >
                                        <SelectTrigger className="mt-1.5">
                                            <SelectValue placeholder={loadingLessons ? t('جاري التحميل...', 'Loading...') : t('اختر الدرس', 'Select lesson')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lessons.map((lesson) => (
                                                <SelectItem key={lesson.id} value={lesson.id}>
                                                    {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 1: Basics */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <div>
                            <Label htmlFor="title_ar">{t('عنوان الاختبار (عربي)', 'Quiz Title (Arabic)')} *</Label>
                            <Input
                                id="title_ar"
                                value={form.title_ar}
                                onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                                className="mt-1.5"
                                placeholder={t('مثال: اختبار الوحدة الأولى', 'E.g., Unit 1 Quiz')}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <Label htmlFor="title_en">{t('عنوان الاختبار (إنجليزي)', 'Quiz Title (English)')}</Label>
                                <TranslationButton sourceText={form.title_ar} sourceLang="ar" targetLang="en"
                                    onTranslated={(text) => setForm(f => ({ ...f, title_en: text }))}
                                    autoTranslating={titleTranslating} />
                            </div>
                            <Input
                                id="title_en"
                                value={form.title_en}
                                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>{t('مفعّل', 'Enabled')}</Label>
                                    <p className="text-xs text-muted-foreground">
                                        {t('ظهور الاختبار للطلاب', 'Show quiz to students')}
                                    </p>
                                </div>
                                <Switch
                                    checked={form.is_enabled}
                                    onCheckedChange={(checked) => setForm({ ...form, is_enabled: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>{t('إلزامي', 'Required')}</Label>
                                    <p className="text-xs text-muted-foreground">
                                        {t('يجب إكمال الاختبار', 'Must complete quiz')}
                                    </p>
                                </div>
                                <Switch
                                    checked={form.is_required}
                                    onCheckedChange={(checked) => setForm({ ...form, is_required: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>{t('إظهار الإجابات', 'Show Answers')}</Label>
                                    <p className="text-xs text-muted-foreground">
                                        {t('بعد التسليم', 'After submission')}
                                    </p>
                                </div>
                                <Switch
                                    checked={form.show_answers_after_submit}
                                    onCheckedChange={(checked) => setForm({ ...form, show_answers_after_submit: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>{t('ترتيب عشوائي', 'Randomize')}</Label>
                                    <p className="text-xs text-muted-foreground">
                                        {t('خلط ترتيب الأسئلة', 'Shuffle questions')}
                                    </p>
                                </div>
                                <Switch
                                    checked={form.randomize_questions}
                                    onCheckedChange={(checked) => setForm({ ...form, randomize_questions: checked })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label>{t('المحاولات المسموحة', 'Attempts Allowed')}</Label>
                                <Select
                                    value={form.attempts_allowed.toString()}
                                    onValueChange={(v) => setForm({ ...form, attempts_allowed: parseInt(v) })}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">{t('غير محدود', 'Unlimited')}</SelectItem>
                                        <SelectItem value="1">1</SelectItem>
                                        <SelectItem value="2">2</SelectItem>
                                        <SelectItem value="3">3</SelectItem>
                                        <SelectItem value="5">5</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>{t('المدة الزمنية (دقيقة)', 'Time Limit (min)')}</Label>
                                <Input
                                    type="number"
                                    value={form.time_limit_minutes || ''}
                                    onChange={(e) => setForm({ ...form, time_limit_minutes: e.target.value ? parseInt(e.target.value) : null })}
                                    className="mt-1.5"
                                    placeholder={t('اختياري', 'Optional')}
                                    min={1}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Questions */}
                {currentStep === 2 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {questions.length} {t('سؤال', 'question(s)')}
                            </p>
                            <Button onClick={openAddQuestion} size="sm">
                                <Plus className="w-4 h-4 me-1" />
                                {t('إضافة سؤال', 'Add Question')}
                            </Button>
                        </div>

                        {questions.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-border rounded-lg">
                                <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">
                                    {t('لم تضف أي أسئلة بعد', 'No questions added yet')}
                                </p>
                                <Button onClick={openAddQuestion} variant="outline" size="sm" className="mt-4">
                                    <Plus className="w-4 h-4 me-1" />
                                    {t('إضافة سؤال', 'Add Question')}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {questions.map((q, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-border"
                                    >
                                        <div className="text-muted-foreground">
                                            <GripVertical className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">
                                                {index + 1}. {q.question_text_ar}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {t(questionTypeLabels[q.question_type].ar, questionTypeLabels[q.question_type].en)} • {q.points} {t('نقطة', 'pt')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => moveQuestion(index, 'up')}
                                                disabled={index === 0}
                                            >
                                                <ArrowUp className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => moveQuestion(index, 'down')}
                                                disabled={index === questions.length - 1}
                                            >
                                                <ArrowDown className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => openEditQuestion(index)}
                                            >
                                                <FileText className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive"
                                                onClick={() => deleteQuestion(index)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Publish */}
                {currentStep === 3 && (
                    <div className="space-y-6">
                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-lg font-semibold">
                                {t('الاختبار جاهز!', 'Quiz is ready!')}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t('يمكنك حفظه كمسودة أو نشره للطلاب', 'Save as draft or publish to students')}
                            </p>
                        </div>

                        <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('العنوان:', 'Title:')}</span>
                                <span className="font-medium">{form.title_ar}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('النوع:', 'Type:')}</span>
                                <span>{form.attachment_type === 'lesson' ? t('درس', 'Lesson') : t('دورة', 'Course')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('عدد الأسئلة:', 'Questions:')}</span>
                                <span>{questions.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('إجمالي النقاط:', 'Total Points:')}</span>
                                <span>{questions.reduce((sum, q) => sum + q.points, 0)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    onClick={goBack}
                    disabled={currentStep === 0}
                >
                    <BackIcon className="w-4 h-4 me-1" />
                    {t('السابق', 'Back')}
                </Button>

                <div className="flex gap-3">
                    {currentStep === steps.length - 1 ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => saveQuiz(false)}
                                disabled={saving}
                            >
                                {saving && <Loader2 className="w-4 h-4 me-1 animate-spin" />}
                                {t('حفظ كمسودة', 'Save Draft')}
                            </Button>
                            <Button
                                onClick={() => saveQuiz(true)}
                                disabled={saving}
                            >
                                {saving && <Loader2 className="w-4 h-4 me-1 animate-spin" />}
                                <Save className="w-4 h-4 me-1" />
                                {t('نشر', 'Publish')}
                            </Button>
                        </>
                    ) : (
                        <Button onClick={goNext} disabled={!canGoNext()}>
                            {t('التالي', 'Next')}
                            <NextIcon className="w-4 h-4 ms-1" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Question Editor Modal */}
            <Dialog open={showQuestionModal} onOpenChange={setShowQuestionModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingQuestionIndex !== null ? t('تعديل السؤال', 'Edit Question') : t('إضافة سؤال', 'Add Question')}
                        </DialogTitle>
                    </DialogHeader>

                    {editingQuestion && (
                        <div className="space-y-4">
                            <div>
                                <Label>{t('نوع السؤال', 'Question Type')}</Label>
                                <Select
                                    value={editingQuestion.question_type}
                                    onValueChange={(v: QuestionType) => {
                                        const isTrue = v === 'true_false';
                                        setEditingQuestion({
                                            ...editingQuestion,
                                            question_type: v,
                                            options: isTrue
                                                ? [
                                                    { option_text_ar: 'صحيح', option_text_en: 'True', is_correct: false },
                                                    { option_text_ar: 'خطأ', option_text_en: 'False', is_correct: false },
                                                ]
                                                : editingQuestion.options,
                                        });
                                    }}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(questionTypeLabels).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {t(label.ar, label.en)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>{t('نص السؤال (عربي)', 'Question Text (Arabic)')} *</Label>
                                <Textarea
                                    value={editingQuestion.question_text_ar}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text_ar: e.target.value })}
                                    className="mt-1.5"
                                    rows={2}
                                />
                            </div>

                            <div>
                                <Label>{t('نص السؤال (إنجليزي)', 'Question Text (English)')}</Label>
                                <Textarea
                                    value={editingQuestion.question_text_en}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text_en: e.target.value })}
                                    className="mt-1.5"
                                    rows={2}
                                />
                            </div>

                            {/* Options */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label>{t('الخيارات', 'Options')}</Label>
                                    {editingQuestion.question_type !== 'true_false' && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingQuestion({
                                                ...editingQuestion,
                                                options: [...editingQuestion.options, { option_text_ar: '', option_text_en: '', is_correct: false }],
                                            })}
                                        >
                                            <Plus className="w-3 h-3 me-1" />
                                            {t('إضافة', 'Add')}
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {editingQuestion.options.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = editingQuestion.options.map((o, i) => ({
                                                        ...o,
                                                        is_correct: editingQuestion.question_type === 'multi_select'
                                                            ? (i === idx ? !o.is_correct : o.is_correct)
                                                            : i === idx,
                                                    }));
                                                    setEditingQuestion({ ...editingQuestion, options: updated });
                                                }}
                                                className={`
                                                    w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                                                    ${opt.is_correct
                                                        ? 'border-green-500 bg-green-500 text-white'
                                                        : 'border-border hover:border-primary'
                                                    }
                                                `}
                                            >
                                                {opt.is_correct && <Check className="w-3 h-3" />}
                                            </button>
                                            <Input
                                                value={opt.option_text_ar}
                                                onChange={(e) => {
                                                    const updated = [...editingQuestion.options];
                                                    updated[idx].option_text_ar = e.target.value;
                                                    setEditingQuestion({ ...editingQuestion, options: updated });
                                                }}
                                                placeholder={t('نص الخيار (عربي)', 'Option text (Arabic)')}
                                                className="flex-1"
                                                disabled={editingQuestion.question_type === 'true_false'}
                                            />
                                            {editingQuestion.question_type !== 'true_false' && editingQuestion.options.length > 2 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive"
                                                    onClick={() => {
                                                        setEditingQuestion({
                                                            ...editingQuestion,
                                                            options: editingQuestion.options.filter((_, i) => i !== idx),
                                                        });
                                                    }}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>{t('النقاط', 'Points')}</Label>
                                    <Input
                                        type="number"
                                        value={editingQuestion.points}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, points: parseInt(e.target.value) || 1 })}
                                        className="mt-1.5"
                                        min={1}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>{t('الشرح (اختياري)', 'Explanation (Optional)')}</Label>
                                <Textarea
                                    value={editingQuestion.explanation_ar}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation_ar: e.target.value })}
                                    className="mt-1.5"
                                    rows={2}
                                    placeholder={t('يظهر للطالب بعد التسليم', 'Shown after submission')}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowQuestionModal(false)}>
                            {t('إلغاء', 'Cancel')}
                        </Button>
                        <Button onClick={saveQuestion}>
                            {t('حفظ', 'Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
