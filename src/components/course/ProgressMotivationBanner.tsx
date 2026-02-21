import { getMotivationMessage } from '@/lib/motivationMessages';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Award, Play, Sparkles } from 'lucide-react';

interface ProgressMotivationBannerProps {
    progressPercent: number;
    isCompleted: boolean;
    completedLessons: number;
    totalLessons: number;
    onContinue: () => void;
    onClaimCertificate?: () => void;
}

export default function ProgressMotivationBanner({
    progressPercent,
    isCompleted,
    completedLessons,
    totalLessons,
    onContinue,
    onClaimCertificate,
}: ProgressMotivationBannerProps) {
    const message = getMotivationMessage(progressPercent);

    return (
        <div
            dir="rtl"
            className={`relative overflow-hidden rounded-xl border p-5 transition-all ${isCompleted
                    ? 'bg-gradient-to-l from-green-50 to-emerald-50 border-green-200 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800'
                    : 'bg-gradient-to-l from-primary/5 to-blue-50 border-primary/20 dark:from-primary/10 dark:to-blue-950/30 dark:border-primary/30'
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
                            <Award className="w-5 h-5 text-green-600" />
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
                        <span>{completedLessons}/{totalLessons} دروس مكتملة</span>
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
                        <Button
                            onClick={onClaimCertificate}
                            className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-200 dark:hover:shadow-green-900/30 transition-all"
                            size="sm"
                        >
                            <Award className="w-4 h-4" />
                            استلام الشهادة
                        </Button>
                    ) : (
                        <Button
                            onClick={onContinue}
                            className="gap-2 shadow-sm"
                            size="sm"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            تابع الدروس
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
