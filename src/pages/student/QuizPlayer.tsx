/**
 * QuizPlayer - Full quiz taking experience
 * Shows questions, tracks answers, handles submission
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Quiz, QuizQuestion, QuizOption, QuizAnswer } from '@/types/database';
import { getDummyQuestionsForQuiz, dummyQuizzes } from '@/data/dummyQuiz';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle,
    AlertCircle,
    Send,
} from 'lucide-react';

export default function QuizPlayer() {
    const { quizId } = useParams<{ quizId: string }>();
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const navigate = useNavigate();
    const startTimeRef = useRef<Date>(new Date());
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // State
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string[]>>({});
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

    // Fetch quiz and questions
    useEffect(() => {
        if (!quizId) return;

        const fetchQuiz = async () => {
            setLoading(true);

            // Fetch quiz
            const { data: quizData } = await supabase
                .from('quizzes')
                .select('*')
                .eq('id', quizId)
                .single();

            let quizToUse = quizData as Quiz | null;

            // Fallback to dummy
            if (!quizToUse) {
                quizToUse = dummyQuizzes.find(q => q.id === quizId) || null;
            }

            if (quizToUse) {
                setQuiz(quizToUse);

                // Set timer if time limit
                if (quizToUse.time_limit_minutes) {
                    setTimeRemaining(quizToUse.time_limit_minutes * 60);
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

                if (questionsData && questionsData.length > 0) {
                    let qs = questionsData as QuizQuestion[];
                    // Randomize if enabled
                    if (quizToUse.randomize_questions) {
                        qs = [...qs].sort(() => Math.random() - 0.5);
                    }
                    setQuestions(qs);
                } else {
                    // Fallback to dummy questions
                    setQuestions(getDummyQuestionsForQuiz(quizId));
                }
            }

            setLoading(false);
        };

        fetchQuiz();
    }, [quizId]);

    // Timer countdown
    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0) return;

        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev === null || prev <= 1) {
                    // Time's up - auto submit
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timeRemaining !== null]);

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle answer selection
    const handleSelectOption = (questionId: string, optionId: string, isMulti: boolean) => {
        setAnswers(prev => {
            const current = prev[questionId] || [];
            if (isMulti) {
                // Toggle for multi-select
                if (current.includes(optionId)) {
                    return { ...prev, [questionId]: current.filter(id => id !== optionId) };
                }
                return { ...prev, [questionId]: [...current, optionId] };
            } else {
                // Single select
                return { ...prev, [questionId]: [optionId] };
            }
        });
    };

    // Submit quiz
    const handleSubmit = useCallback(async () => {
        if (!quiz || !profile?.id || submitting) return;

        setSubmitting(true);

        // Calculate score
        let totalPoints = 0;
        let earnedPoints = 0;
        const answerResults: QuizAnswer[] = [];

        for (const question of questions) {
            totalPoints += question.points;
            const selectedOptions = answers[question.id] || [];
            const correctOptions = (question.options || []).filter(o => o.is_correct).map(o => o.id);

            // Check if answer is correct
            const isCorrect =
                selectedOptions.length === correctOptions.length &&
                selectedOptions.every(id => correctOptions.includes(id));

            if (isCorrect) {
                earnedPoints += question.points;
            }

            answerResults.push({
                question_id: question.id,
                selected_options: selectedOptions,
                is_correct: isCorrect,
            });
        }

        const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        const passed = quiz.passing_score_percent ? scorePercent >= quiz.passing_score_percent : null;
        const timeSpent = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000);

        // Save attempt
        const { data: attempt } = await supabase
            .from('quiz_attempts')
            .insert({
                quiz_id: quiz.id,
                student_id: profile.id,
                score_percent: scorePercent,
                total_points: totalPoints,
                earned_points: earnedPoints,
                answers: answerResults,
                passed,
                time_spent_seconds: timeSpent,
            })
            .select('id')
            .single();

        // Navigate to results
        if (attempt) {
            navigate(`/student/quiz/${quiz.id}/results/${attempt.id}`);
        } else {
            // Fallback - show results inline
            navigate(`/student/quiz/${quiz.id}/results/demo`, {
                state: { scorePercent, earnedPoints, totalPoints, passed, answers: answerResults, questions },
            });
        }

        setSubmitting(false);
    }, [quiz, profile?.id, questions, answers, submitting, navigate]);

    // Navigation icons
    const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;
    const NextIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    // Loading
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // No quiz found
    if (!quiz || questions.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <h1 className="text-xl font-bold mb-2">{t('الاختبار غير متاح', 'Quiz not available')}</h1>
                <Button onClick={() => navigate(-1)}>{t('العودة', 'Go Back')}</Button>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const isMultiSelect = currentQuestion.question_type === 'multi_select';
    const selectedOptions = answers[currentQuestion.id] || [];
    const answeredCount = Object.keys(answers).filter(id => answers[id].length > 0).length;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-3">
                <div className="container mx-auto max-w-3xl flex items-center justify-between">
                    <div>
                        <h1 className="font-semibold text-foreground line-clamp-1">
                            {t(quiz.title_ar, quiz.title_en || quiz.title_ar)}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {t('سؤال', 'Question')} {currentIndex + 1} / {questions.length}
                        </p>
                    </div>

                    {timeRemaining !== null && (
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${timeRemaining < 60 ? 'bg-red-100 text-red-700' : 'bg-secondary text-foreground'}`}>
                            <Clock className="w-4 h-4" />
                            {formatTime(timeRemaining)}
                        </div>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-secondary">
                <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
            </div>

            {/* Question */}
            <div className="container mx-auto max-w-3xl p-4 lg:p-6">
                <div className="bg-background rounded-xl border border-border p-6 mb-6">
                    {/* Question text */}
                    <div className="mb-6">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                            {currentQuestion.points} {t('نقطة', 'point(s)')} • {isMultiSelect ? t('اختر أكثر من إجابة', 'Select multiple') : t('اختر إجابة واحدة', 'Select one')}
                        </span>
                        <h2 className="text-lg font-medium text-foreground">
                            {t(currentQuestion.question_text_ar, currentQuestion.question_text_en || currentQuestion.question_text_ar)}
                        </h2>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        {(currentQuestion.options || []).map((option) => {
                            const isSelected = selectedOptions.includes(option.id);
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleSelectOption(currentQuestion.id, option.id, isMultiSelect)}
                                    className={`
                                        w-full text-start p-4 rounded-lg border-2 transition-all
                                        ${isSelected
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`
                                            w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                                            ${isSelected
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-muted-foreground/30'
                                            }
                                        `}>
                                            {isSelected && <CheckCircle className="w-4 h-4" />}
                                        </div>
                                        <span className="text-foreground">
                                            {t(option.option_text_ar, option.option_text_en || option.option_text_ar)}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentIndex(currentIndex - 1)}
                        disabled={currentIndex === 0}
                    >
                        <BackIcon className="w-4 h-4 me-1" />
                        {t('السابق', 'Previous')}
                    </Button>

                    <span className="text-sm text-muted-foreground">
                        {answeredCount} / {questions.length} {t('مجاب', 'answered')}
                    </span>

                    {currentIndex === questions.length - 1 ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || answeredCount === 0}
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 me-1 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 me-1" />
                            )}
                            {t('تسليم', 'Submit')}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => setCurrentIndex(currentIndex + 1)}
                        >
                            {t('التالي', 'Next')}
                            <NextIcon className="w-4 h-4 ms-1" />
                        </Button>
                    )}
                </div>

                {/* Question dots */}
                <div className="flex flex-wrap justify-center gap-2 mt-8">
                    {questions.map((q, idx) => {
                        const isAnswered = !!answers[q.id]?.length;
                        return (
                            <button
                                key={q.id}
                                onClick={() => setCurrentIndex(idx)}
                                className={`
                                    w-8 h-8 rounded-full text-xs font-medium transition-colors
                                    ${idx === currentIndex
                                        ? 'bg-primary text-primary-foreground'
                                        : isAnswered
                                            ? 'bg-green-100 text-green-700 border border-green-300'
                                            : 'bg-secondary text-muted-foreground'
                                    }
                                `}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
