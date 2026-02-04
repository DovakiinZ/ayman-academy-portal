/**
 * QuizResults - Shows quiz results after submission
 * Displays score, pass/fail status, and correct answers if enabled
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Quiz, QuizQuestion, QuizAttempt, QuizAnswer } from '@/types/database';
import { dummyQuizzes, getDummyQuestionsForQuiz } from '@/data/dummyQuiz';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    Trophy,
    XCircle,
    CheckCircle,
    Clock,
    ArrowRight,
    ArrowLeft,
    RotateCcw,
    Home,
} from 'lucide-react';

export default function QuizResults() {
    const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // State passed from QuizPlayer for demo mode
    const demoState = location.state as {
        scorePercent?: number;
        earnedPoints?: number;
        totalPoints?: number;
        passed?: boolean | null;
        answers?: QuizAnswer[];
        questions?: QuizQuestion[];
    } | null;

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch data
    useEffect(() => {
        if (!quizId) return;

        const fetchData = async () => {
            setLoading(true);

            // Fetch quiz
            const { data: quizData } = await supabase
                .from('quizzes')
                .select('*')
                .eq('id', quizId)
                .single();

            let quizToUse = quizData as Quiz | null;
            if (!quizToUse) {
                quizToUse = dummyQuizzes.find(q => q.id === quizId) || null;
            }
            setQuiz(quizToUse);

            // Fetch attempt (unless demo mode)
            if (attemptId && attemptId !== 'demo') {
                const { data: attemptData } = await supabase
                    .from('quiz_attempts')
                    .select('*')
                    .eq('id', attemptId)
                    .single();

                if (attemptData) {
                    setAttempt(attemptData as QuizAttempt);
                }
            } else if (demoState) {
                // Use demo state
                setAttempt({
                    id: 'demo',
                    quiz_id: quizId,
                    student_id: profile?.id || '',
                    score_percent: demoState.scorePercent || 0,
                    total_points: demoState.totalPoints || 0,
                    earned_points: demoState.earnedPoints || 0,
                    answers: demoState.answers || [],
                    passed: demoState.passed || null,
                    started_at: new Date().toISOString(),
                    submitted_at: new Date().toISOString(),
                    time_spent_seconds: 0,
                });
            }

            // Fetch questions if show_answers enabled
            if (quizToUse?.show_answers_after_submit) {
                if (demoState?.questions) {
                    setQuestions(demoState.questions);
                } else {
                    const { data: questionsData } = await supabase
                        .from('quiz_questions')
                        .select(`
                            *,
                            options:quiz_options(*)
                        `)
                        .eq('quiz_id', quizId)
                        .order('order_index', { ascending: true });

                    if (questionsData && questionsData.length > 0) {
                        setQuestions(questionsData as QuizQuestion[]);
                    } else {
                        setQuestions(getDummyQuestionsForQuiz(quizId));
                    }
                }
            }

            setLoading(false);
        };

        fetchData();
    }, [quizId, attemptId, demoState, profile?.id]);

    const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!quiz || !attempt) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
                <XCircle className="w-12 h-12 text-destructive mb-4" />
                <h1 className="text-xl font-bold mb-2">{t('النتائج غير متاحة', 'Results not available')}</h1>
                <Button onClick={() => navigate(-1)}>{t('العودة', 'Go Back')}</Button>
            </div>
        );
    }

    const isPassed = attempt.passed === true;
    const isFailed = attempt.passed === false;
    const isNoPassingScore = attempt.passed === null;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-background border-b border-border px-4 py-4">
                <div className="container mx-auto max-w-3xl">
                    <h1 className="font-semibold text-foreground">
                        {t('نتائج الاختبار', 'Quiz Results')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t(quiz.title_ar, quiz.title_en || quiz.title_ar)}
                    </p>
                </div>
            </div>

            <div className="container mx-auto max-w-3xl p-4 lg:p-6 space-y-6">
                {/* Score card */}
                <div className={`
                    rounded-2xl p-8 text-center relative overflow-hidden
                    ${isPassed
                        ? 'bg-gradient-to-br from-green-50 to-green-100 border border-green-200'
                        : isFailed
                            ? 'bg-gradient-to-br from-red-50 to-red-100 border border-red-200'
                            : 'bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20'
                    }
                `}>
                    <div className="relative z-10">
                        {/* Icon */}
                        <div className={`
                            w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center
                            ${isPassed
                                ? 'bg-green-500 text-white'
                                : isFailed
                                    ? 'bg-red-500 text-white'
                                    : 'bg-primary text-primary-foreground'
                            }
                        `}>
                            {isPassed ? (
                                <Trophy className="w-10 h-10" />
                            ) : isFailed ? (
                                <XCircle className="w-10 h-10" />
                            ) : (
                                <CheckCircle className="w-10 h-10" />
                            )}
                        </div>

                        {/* Score */}
                        <div className="text-5xl font-bold mb-2">
                            {attempt.score_percent}%
                        </div>

                        {/* Status */}
                        <p className={`text-lg font-medium mb-4 ${isPassed ? 'text-green-700' : isFailed ? 'text-red-700' : 'text-foreground'}`}>
                            {isPassed
                                ? t('تهانينا! لقد نجحت', 'Congratulations! You passed')
                                : isFailed
                                    ? t('للأسف لم تنجح، حاول مرة أخرى', 'Unfortunately you didn\'t pass. Try again!')
                                    : t('أكملت الاختبار بنجاح', 'Quiz completed!')}
                        </p>

                        {/* Stats */}
                        <div className="flex justify-center gap-6 text-sm">
                            <div>
                                <span className="text-muted-foreground">{t('النقاط:', 'Points:')}</span>
                                <span className="font-medium ms-1">{attempt.earned_points}/{attempt.total_points}</span>
                            </div>
                            {attempt.time_spent_seconds && (
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span>
                                        {Math.floor(attempt.time_spent_seconds / 60)}:{(attempt.time_spent_seconds % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {quiz.passing_score_percent && (
                            <p className="text-xs text-muted-foreground mt-2">
                                {t('درجة النجاح:', 'Passing score:')} {quiz.passing_score_percent}%
                            </p>
                        )}
                    </div>
                </div>

                {/* Answer review */}
                {quiz.show_answers_after_submit && questions.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="font-semibold text-lg">
                            {t('مراجعة الإجابات', 'Answer Review')}
                        </h2>

                        {questions.map((question, idx) => {
                            const answer = (attempt.answers as QuizAnswer[]).find(a => a.question_id === question.id);
                            const isCorrect = answer?.is_correct;

                            return (
                                <div
                                    key={question.id}
                                    className={`
                                        rounded-lg border p-4
                                        ${isCorrect
                                            ? 'border-green-200 bg-green-50/50'
                                            : 'border-red-200 bg-red-50/50'
                                        }
                                    `}
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className={`
                                            w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-medium
                                            ${isCorrect ? 'bg-green-500' : 'bg-red-500'}
                                        `}>
                                            {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">
                                                {idx + 1}. {t(question.question_text_ar, question.question_text_en || question.question_text_ar)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Options */}
                                    <div className="space-y-2 ms-9">
                                        {(question.options || []).map((option) => {
                                            const wasSelected = answer?.selected_options?.includes(option.id);
                                            return (
                                                <div
                                                    key={option.id}
                                                    className={`
                                                        text-sm px-3 py-2 rounded-md flex items-center gap-2
                                                        ${option.is_correct
                                                            ? 'bg-green-100 text-green-800 border border-green-300'
                                                            : wasSelected
                                                                ? 'bg-red-100 text-red-800 border border-red-300'
                                                                : 'bg-background border border-border text-muted-foreground'
                                                        }
                                                    `}
                                                >
                                                    {option.is_correct && <CheckCircle className="w-4 h-4 text-green-600" />}
                                                    {wasSelected && !option.is_correct && <XCircle className="w-4 h-4 text-red-600" />}
                                                    {t(option.option_text_ar, option.option_text_en || option.option_text_ar)}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Explanation */}
                                    {question.explanation_ar && (
                                        <div className="mt-3 ms-9 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                                            <strong>{t('الشرح:', 'Explanation:')}</strong>{' '}
                                            {t(question.explanation_ar, question.explanation_en || question.explanation_ar)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/student/courses')}
                        className="flex-1"
                    >
                        <Home className="w-4 h-4 me-2" />
                        {t('العودة للدورات', 'Back to Courses')}
                    </Button>

                    {isFailed && (
                        <Button
                            onClick={() => navigate(`/student/quiz/${quizId}`)}
                            className="flex-1"
                        >
                            <RotateCcw className="w-4 h-4 me-2" />
                            {t('إعادة المحاولة', 'Try Again')}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
