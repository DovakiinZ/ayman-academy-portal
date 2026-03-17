import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getStudentLevel, getNextLevelInfo, getLevelLabel, getLevelIcon } from '@/lib/gamificationService';
import type { StudentLevel } from '@/types/database';
import { Loader2 } from 'lucide-react';

interface Props {
    studentId: string;
    compact?: boolean;
}

export default function XPProgressBar({ studentId, compact = false }: Props) {
    const { t } = useLanguage();
    const [level, setLevel] = useState<StudentLevel | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const data = await getStudentLevel(studentId);
            setLevel(data);
            setLoading(false);
        })();
    }, [studentId]);

    if (loading) {
        return <div className="flex items-center justify-center p-3"><Loader2 className="w-4 h-4 animate-spin" /></div>;
    }

    const totalXP = level?.total_xp || 0;
    const currentLevel = level?.current_level || 'beginner';
    const streakDays = level?.streak_days || 0;
    const { nextLevel, xpNeeded, progress } = getNextLevelInfo(totalXP);

    if (compact) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-full border border-amber-200">
                <span className="text-lg">{getLevelIcon(currentLevel)}</span>
                <span className="text-xs font-bold text-amber-800">
                    {getLevelLabel(currentLevel, t('ar', 'en') as 'ar' | 'en')}
                </span>
                <span className="text-xs text-amber-600 font-medium">{totalXP} XP</span>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-xl border border-amber-200/50 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{getLevelIcon(currentLevel)}</span>
                    <div>
                        <p className="text-sm font-bold text-amber-900">
                            {getLevelLabel(currentLevel, t('ar', 'en') as 'ar' | 'en')}
                        </p>
                        <p className="text-xs text-amber-600">{totalXP} XP</p>
                    </div>
                </div>
                {streakDays > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-full border border-red-200">
                        <span className="text-sm">🔥</span>
                        <span className="text-xs font-bold text-red-700">{streakDays}</span>
                        <span className="text-xs text-red-600">{t('يوم', 'days')}</span>
                    </div>
                )}
            </div>

            {/* Progress bar */}
            {nextLevel && (
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-amber-700">
                        <span>{getLevelLabel(currentLevel, t('ar', 'en') as 'ar' | 'en')}</span>
                        <span>{getLevelLabel(nextLevel, t('ar', 'en') as 'ar' | 'en')}</span>
                    </div>
                    <div className="h-2.5 bg-amber-200/50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-amber-600 text-center">
                        {t(`باقي ${xpNeeded} نقطة للمستوى التالي`, `${xpNeeded} XP to next level`)}
                    </p>
                </div>
            )}

            {!nextLevel && (
                <p className="text-xs text-center text-amber-700 font-medium">
                    {t('وصلت لأعلى مستوى! 🎉', 'Max level reached! 🎉')}
                </p>
            )}
        </div>
    );
}
