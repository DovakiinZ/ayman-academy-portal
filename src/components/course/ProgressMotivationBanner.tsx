import { useState, useEffect } from 'react';
import { getMotivationMessage } from '@/lib/motivationMessages';
import { Trophy, ArrowRight, Loader2, Award, Sparkles, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { evaluateEligibility } from '@/lib/eligibilityService';

interface ProgressMotivationBannerProps {
    progressPercent: number;
    isCompleted: boolean;
    completedLessons: number;
    totalLessons: number;
    subjectId?: string;
    onContinue: () => void;
}

export default function ProgressMotivationBanner({
    progressPercent,
    isCompleted,
    completedLessons,
    totalLessons,
    subjectId,
    onContinue,
}: ProgressMotivationBannerProps) {
    const { t } = useLanguage();
    const { profile } = useAuth();
    const [eligible, setEligible] = useState(false);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (isCompleted && subjectId && profile?.id) {
            checkEligibility();
        }
    }, [isCompleted, subjectId, profile?.id]);

    const checkEligibility = async () => {
        setChecking(true);
        try {
            const res = await evaluateEligibility(profile!.id, subjectId!);
            setEligible(res.eligible);
        } catch (err) {
            console.error('Eligibility check error:', err);
        } finally {
            setChecking(false);
        }
    };

    const message = getMotivationMessage(progressPercent);

    return (
        <div
            dir="rtl"
            className={`relative overflow-hidden rounded-xl border p-5 transition-all ${isCompleted
                    ? 'bg-gradient-to-l from-green-500/5 to-emerald-500/5 border-green-500/20'
                    : 'bg-gradient-to-l from-primary/10 to-blue-500/10 border-primary/20'
                }`}
        >
            {/* Decorative element */}
            <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-primary/5 blur-xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
                {/* Header Row */}
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCompleted
                            ? 'bg-green-100 dark:bg-green-900/40'
                            : 'bg-primary/10'
                        }`}>
                        {isCompleted ? (
                            <Award className="w-5 h-5 text-green-500" />
                        ) : (
                            <Sparkles className="w-5 h-5 text-primary" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-relaxed">
                            {message}
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{completedLessons}/{totalLessons} {t('دروس مكتملة', 'lessons completed')}</span>
                        <span className="font-bold text-primary">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-secondary/60 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${isCompleted ? 'bg-green-500' : 'bg-primary'
                                }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* CTA */}
                <div className="flex items-center gap-2">
                    {isCompleted ? (
                        <>
                            {checking ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    {t('جاري التحقق من الأهلية...', 'Checking eligibility...')}
                                </div>
                            ) : eligible ? (
                                <Button
                                    onClick={() => {
                                        const el = document.getElementById('certificate-requirements');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-200 dark:hover:shadow-green-900/30 transition-all font-bold"
                                    size="sm"
                                >
                                    <Trophy className="w-4 h-4" />
                                    {t('احصل على شهادتك الآن!', 'Get your certificate now!')}
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] text-amber-700 dark:text-amber-400">
                                    <Trophy className="w-3.5 h-3.5" />
                                    {t('أنهيت الدروس! أكمل المتطلبات المتبقية أدناه للحصول على الشهادة.', 'Lessons done! Complete the remaining requirements below to get your certificate.')}
                                </div>
                            )}
                        </>
                    ) : (
                        <Button
                            onClick={onContinue}
                            className="gap-2 shadow-sm font-bold"
                            size="sm"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {t('تابع الدروس', 'Continue Lessons')}
                            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
