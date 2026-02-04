/**
 * LessonQuizSection - Shows quiz button after lesson content
 * Displayed at the bottom of LessonPlayer when a quiz is attached
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Quiz, QuizAttempt } from '@/types/database';
import { getDummyQuizForLesson } from '@/data/dummyQuiz';
import { Button } from '@/components/ui/button';
import {
    ClipboardList,
    CheckCircle,
    Clock,
    ArrowLeft,
    ArrowRight,
    Trophy,
    AlertCircle,
    Loader2,
} from 'lucide-react';

interface LessonQuizSectionProps {
    lessonId: string;
    onQuizComplete?: () => void;
}

export default function LessonQuizSection({ lessonId, onQuizComplete }: LessonQuizSectionProps) {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch quiz for this lesson
    useEffect(() => {
        if (!lessonId) return;

        const fetchQuiz = async () => {
            setLoading(true);

            // Try to fetch real quiz
            const { data: quizData } = await supabase
                .from('quizzes')
                .select('*')
                .eq('lesson_id', lessonId)
                .eq('is_enabled', true)
                .eq('is_published', true)
                .single();

            if (quizData) {
                setQuiz(quizData as Quiz);

                // Fetch user's attempts
                if (profile?.id) {
                    const { data: attemptsData } = await supabase
                        .from('quiz_attempts')
                        .select('*')
                        .eq('quiz_id', quizData.id)
                        .eq('student_id', profile.id)
                        .order('submitted_at', { ascending: false });

                    if (attemptsData) {
                        setAttempts(attemptsData as QuizAttempt[]);
                    }
                }
            } else {
                // Try dummy data
                const dummyQuiz = getDummyQuizForLesson(lessonId);
                setQuiz(dummyQuiz);
            }

            setLoading(false);
        };

        fetchQuiz();
    }, [lessonId, profile?.id]);

    // No quiz attached
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!quiz) {
        return null; // No quiz for this lesson
    }

    const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;
    const bestAttempt = attempts.length > 0 ? attempts.reduce((best, a) => a.score_percent > best.score_percent ? a : best, attempts[0]) : null;
    const canRetry = quiz.attempts_allowed === 0 || attempts.length < quiz.attempts_allowed;

    return (
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-6 h-6 text-primary" />
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">
                            {t(quiz.title_ar, quiz.title_en || quiz.title_ar)}
                        </h3>
                        {quiz.is_required && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                {t('إلزامي', 'Required')}
                            </span>
                        )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-4">
                        {quiz.is_required
                            ? t('أكمل هذا الاختبار للانتقال إلى الدرس التالي', 'Complete this quiz to proceed to the next lesson')
                            : t('اختبار قصير لتقييم فهمك (اختياري)', 'Short quiz to assess your understanding (optional)')}
                    </p>

                    {/* Quiz info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                        {quiz.questions_count && (
                            <span className="flex items-center gap-1">
                                <ClipboardList className="w-4 h-4" />
                                {quiz.questions_count} {t('سؤال', 'questions')}
                            </span>
                        )}
                        {quiz.time_limit_minutes && (
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {quiz.time_limit_minutes} {t('دقيقة', 'min')}
                            </span>
                        )}
                        {quiz.passing_score_percent && (
                            <span className="flex items-center gap-1">
                                <Trophy className="w-4 h-4" />
                                {t('درجة النجاح:', 'Passing:')} {quiz.passing_score_percent}%
                            </span>
                        )}
                    </div>

                    {/* Previous attempts */}
                    {attempts.length > 0 && (
                        <div className="bg-background/50 rounded-lg p-3 mb-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                    {t('أفضل نتيجة:', 'Best score:')}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-lg font-bold ${bestAttempt && bestAttempt.passed ? 'text-green-600' : 'text-foreground'}`}>
                                        {bestAttempt?.score_percent}%
                                    </span>
                                    {bestAttempt?.passed && (
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {attempts.length} {t('محاولة', 'attempt(s)')}
                                {quiz.attempts_allowed > 0 && ` / ${quiz.attempts_allowed} ${t('مسموح', 'allowed')}`}
                            </p>
                        </div>
                    )}

                    {/* Action button */}
                    {canRetry ? (
                        <Button
                            onClick={() => navigate(`/student/quiz/${quiz.id}`)}
                            className="w-full sm:w-auto"
                        >
                            {attempts.length > 0 ? t('إعادة المحاولة', 'Retry Quiz') : t('ابدأ الاختبار', 'Start Quiz')}
                            <ArrowIcon className="w-4 h-4 ms-2" />
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <AlertCircle className="w-4 h-4" />
                            {t('استنفدت جميع المحاولات', 'No attempts remaining')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
