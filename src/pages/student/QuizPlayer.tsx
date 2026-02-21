import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle, XCircle, RefreshCw, Award, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useParams, Link } from 'react-router-dom';
import { useSettings } from '@/contexts/SettingsContext';
import { LessonQuizQuestion } from '@/types/database';
import { issueCertificate } from '@/lib/certificateGenerator';

interface QuizPlayerProps {
    quizId?: string;
    lessonId?: string;
}

export default function QuizPlayer({ quizId: propQuizId, lessonId: propLessonId }: QuizPlayerProps) {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const { get } = useSettings();
    const params = useParams<{ quizId: string }>();
    const quizId = propQuizId || params.quizId;
    const [certificateIssued, setCertificateIssued] = useState(false);
    const [issuingCert, setIssuingCert] = useState(false);

    const [questions, setQuestions] = useState<LessonQuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<string, string>>({}); // valid question_id -> selected_option_value
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        if (quizId) fetchQuiz();
    }, [quizId]);

    const fetchQuiz = async () => {
        try {
            const { data, error } = await supabase
                .from('lesson_quiz_questions')
                .select('*')
                .eq('quiz_id', quizId)
                .order('order_index', { ascending: true });

            if (error) throw error;
            setQuestions(data || []);
        } catch (error) {
            console.error('Error fetching quiz:', error);
            toast.error(t('فشل تحميل الاختبار', 'Failed to load quiz'));
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (questionId: string, value: string) => {
        if (submitted) return;
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length < questions.length) {
            toast.error(t('الرجاء الإجابة على جميع الأسئلة', 'Please answer all questions'));
            return;
        }

        let correctCount = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correct_answer) {
                correctCount++;
            }
        });

        const finalScore = Math.round((correctCount / questions.length) * 100);
        setScore(finalScore);
        setSubmitted(true);

        // Auto-issue certificate if passed
        const threshold = get('completion.certificate_threshold_percent', 70);
        if (finalScore >= threshold && profile && propLessonId) {
            setIssuingCert(true);
            try {
                // Fetch lesson + subject info for the certificate
                const { data: lessonData } = await supabase
                    .from('lessons')
                    .select('title_ar, subject_id, subjects(title_ar)')
                    .eq('id', propLessonId)
                    .single() as any;

                const courseName = lessonData?.title_ar || 'درس';
                const subjectName = lessonData?.subjects?.title_ar || undefined;
                const subjectId = lessonData?.subject_id || undefined;

                const { certificate, error } = await issueCertificate({
                    studentId: profile.id,
                    studentName: profile.full_name || profile.email || 'طالب',
                    lessonId: propLessonId,
                    courseName,
                    subjectName,
                    subjectId,
                    score: finalScore,
                });

                if (certificate) {
                    setCertificateIssued(true);
                    toast.success(t('🎉 تم إصدار شهادة الإتمام!', '🎉 Certificate issued!'));
                }
            } catch (err) {
                console.error('Certificate issuance error:', err);
            } finally {
                setIssuingCert(false);
            }
        }
    };

    const handleRetry = () => {
        setAnswers({});
        setSubmitted(false);
        setScore(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) {
        return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (questions.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">{t('لا توجد أسئلة في هذا الاختبار', 'No questions in this quiz')}</div>;
    }

    if (submitted) {
        return (
            <div className="text-center py-12 animate-in zoom-in-95 duration-300">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Award className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-2">{score}%</h2>
                <p className="text-muted-foreground mb-8">
                    {score >= get('completion.certificate_threshold_percent', 70) ? t('ممتاز! لقد اجتزت الاختبار', 'Excellent! You passed the quiz') : t('حاول مرة أخرى لتحسين نتيجتك', 'Try again to improve your score')}
                </p>

                <div className="max-w-2xl mx-auto text-start space-y-6 mb-12">
                    {questions.map((q, idx) => {
                        const isCorrect = answers[q.id] === q.correct_answer;
                        return (
                            <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}`}>
                                <div className="flex gap-3">
                                    {isCorrect ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                                    <div className="flex-1">
                                        <p className="font-medium mb-1">{idx + 1}. {t(q.question_ar, q.question_en)}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('إجابتك:', 'Your answer:')} {answers[q.id]}
                                        </p>
                                        {!isCorrect && (
                                            <p className="text-sm font-medium text-green-700 mt-1">
                                                {t('الإجابة الصحيحة:', 'Correct answer:')} {q.correct_answer}
                                            </p>
                                        )}
                                        {(q.explanation_ar || q.explanation_en) && (
                                            <div className="mt-2 text-xs opacity-80 border-t border-current/20 pt-2">
                                                {t(q.explanation_ar || '', q.explanation_en || q.explanation_ar || '')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-center gap-3 flex-wrap">
                    {certificateIssued && (
                        <Link to="/student/certificates">
                            <Button className="gap-2">
                                <Download className="w-4 h-4" />
                                {t('شهاداتي', 'My Certificates')}
                            </Button>
                        </Link>
                    )}
                    {issuingCert && (
                        <Button disabled>
                            <Loader2 className="w-4 h-4 me-2 animate-spin" />
                            {t('جاري إصدار الشهادة...', 'Issuing certificate...')}
                        </Button>
                    )}
                    <Button onClick={handleRetry} variant="outline">
                        <RefreshCw className="w-4 h-4 me-2" />
                        {t('إعادة المحاولة', 'Retry Quiz')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {questions.map((q, idx) => (
                <div key={q.id} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {idx + 1}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-medium mb-4">{t(q.question_ar, q.question_en)}</h3>
                            <RadioGroup
                                value={answers[q.id]}
                                onValueChange={(val) => handleAnswer(q.id, val)}
                                className="space-y-3"
                            >
                                {Array.isArray(q.options) && q.options.map((option: string, optIdx: number) => (
                                    <div key={optIdx} className="flex items-center space-x-2 space-x-reverse">
                                        <RadioGroupItem value={option} id={`q${q.id}-opt${optIdx}`} />
                                        <Label htmlFor={`q${q.id}-opt${optIdx}`} className="font-normal cursor-pointer flex-1 p-2 rounded hover:bg-secondary/50 transition-colors">
                                            {option}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </div>
                </div>
            ))}

            <div className="flex justify-end pt-6 border-t border-border">
                <Button size="lg" onClick={handleSubmit}>
                    {t('تسليم الإجابات', 'Submit Answers')}
                </Button>
            </div>
        </div>
    );
}
