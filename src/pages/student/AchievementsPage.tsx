import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAllBadges, getStudentBadges, getStudentLevel, getStudentXPHistory, getLevelLabel, getLevelIcon, getNextLevelInfo } from '@/lib/gamificationService';
import type { Badge, StudentBadge, StudentLevel, StudentXP } from '@/types/database';
import { Loader2, Trophy, Flame, Star } from 'lucide-react';

export default function AchievementsPage() {
    const { profile } = useAuth();
    const { t } = useLanguage();
    const [allBadges, setAllBadges] = useState<Badge[]>([]);
    const [earnedBadges, setEarnedBadges] = useState<StudentBadge[]>([]);
    const [level, setLevel] = useState<StudentLevel | null>(null);
    const [xpHistory, setXpHistory] = useState<StudentXP[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.id) return;
        (async () => {
            const [badges, earned, lvl, history] = await Promise.all([
                getAllBadges(),
                getStudentBadges(profile.id),
                getStudentLevel(profile.id),
                getStudentXPHistory(profile.id, 30),
            ]);
            setAllBadges(badges);
            setEarnedBadges(earned);
            setLevel(lvl);
            setXpHistory(history);
            setLoading(false);
        })();
    }, [profile?.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const totalXP = level?.total_xp || 0;
    const currentLevel = level?.current_level || 'beginner';
    const streakDays = level?.streak_days || 0;
    const { nextLevel, xpNeeded, progress } = getNextLevelInfo(totalXP);
    const earnedBadgeIds = new Set(earnedBadges.map(b => b.badge_id));
    const lang = t('ar', 'en') as 'ar' | 'en';

    const eventLabels: Record<string, { ar: string; en: string }> = {
        lesson_complete: { ar: 'إكمال درس', en: 'Lesson Complete' },
        quiz_pass: { ar: 'اجتياز اختبار', en: 'Quiz Pass' },
        streak_day: { ar: 'يوم متتالي', en: 'Streak Day' },
        assignment_submit: { ar: 'تسليم واجب', en: 'Assignment' },
        certificate_earned: { ar: 'شهادة', en: 'Certificate' },
        badge_earned: { ar: 'وسام', en: 'Badge' },
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-amber-500" />
                    {t('الإنجازات', 'Achievements')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('تتبع تقدمك واربح الأوسمة', 'Track your progress and earn badges')}
                </p>
            </div>

            {/* Level Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 rounded-2xl border border-amber-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">{getLevelIcon(currentLevel)}</span>
                        <div>
                            <p className="text-lg font-bold text-amber-900 dark:text-amber-200">{getLevelLabel(currentLevel, lang)}</p>
                            <p className="text-sm text-amber-600 dark:text-amber-400">{totalXP} XP {t('إجمالي', 'total')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {streakDays > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 rounded-xl border border-red-500/20">
                                <Flame className="w-5 h-5 text-red-500" />
                                <div className="text-center">
                                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{streakDays}</p>
                                    <p className="text-xs text-red-600 dark:text-red-400/70">{t('يوم متتالي', 'day streak')}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {nextLevel && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-amber-700">
                            <span>{getLevelLabel(currentLevel, lang)}</span>
                            <span>{getLevelLabel(nextLevel, lang)}</span>
                        </div>
                        <div className="h-3 bg-amber-500/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                            {t(`باقي ${xpNeeded} نقطة`, `${xpNeeded} XP to go`)}
                        </p>
                    </div>
                )}
            </div>

            {/* Badges Grid */}
            <div>
                <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    {t('الأوسمة', 'Badges')}
                    <span className="text-xs text-muted-foreground font-normal">
                        ({earnedBadges.length}/{allBadges.length})
                    </span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {allBadges.map((badge) => {
                        const earned = earnedBadgeIds.has(badge.id);
                        return (
                            <div
                                key={badge.id}
                                className={`rounded-xl border p-4 text-center transition-all ${earned
                                    ? 'bg-card border-amber-500/20 shadow-sm'
                                    : 'bg-secondary border-border opacity-50 grayscale'
                                    }`}
                            >
                                <span className="text-3xl block mb-2">{badge.icon}</span>
                                <p className={`text-sm font-medium ${earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {lang === 'ar' ? badge.name_ar : badge.name_en}
                                </p>
                                {badge.description_ar && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {lang === 'ar' ? badge.description_ar : badge.description_en}
                                    </p>
                                )}
                                {earned && (
                                    <span className="inline-block mt-2 text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
                                        ✓ {t('مُكتسب', 'Earned')}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* XP History */}
            {xpHistory.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-foreground mb-3">
                        {t('سجل النقاط', 'XP History')}
                    </h2>
                    <div className="bg-card rounded-xl border border-border divide-y divide-border">
                        {xpHistory.map((xp) => (
                            <div key={xp.id} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        {t(
                                            eventLabels[xp.event_type]?.ar || xp.event_type,
                                            eventLabels[xp.event_type]?.en || xp.event_type
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(xp.created_at).toLocaleDateString('ar-EG')}
                                    </p>
                                </div>
                                <span className="text-sm font-bold text-amber-600">+{xp.points} XP</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
