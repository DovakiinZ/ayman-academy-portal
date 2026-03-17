import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { evaluateCourseQuality, getScoreColor, getScoreLabel, getRiskLabel } from '@/lib/teacherEvaluationService';
import type { CourseQualityReport } from '@/types/database';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, TrendingDown, BarChart3, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    subjectId: string;
    subjectName: string;
}

export default function CourseHealthPanel({ subjectId, subjectName }: Props) {
    const { t } = useLanguage();
    const [report, setReport] = useState<CourseQualityReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const lang = t('ar', 'en') as 'ar' | 'en';

    const loadReport = async (forceRefresh = false) => {
        if (forceRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const data = await evaluateCourseQuality(subjectId);
            setReport(data);
        } catch { /* ignore */ }

        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => { loadReport(); }, [subjectId]);

    if (loading) {
        return (
            <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
        );
    }

    if (!report) return null;

    const ScoreCircle = ({ score, label, size = 'md' }: { score: number; label: string; size?: 'sm' | 'md' }) => {
        const radius = size === 'md' ? 36 : 24;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (score / 100) * circumference;

        return (
            <div className="flex flex-col items-center gap-1">
                <div className="relative" style={{ width: (radius + 8) * 2, height: (radius + 8) * 2 }}>
                    <svg className="transform -rotate-90" width={(radius + 8) * 2} height={(radius + 8) * 2}>
                        <circle cx={radius + 8} cy={radius + 8} r={radius} fill="none" stroke="currentColor" className="text-border" strokeWidth="6" />
                        <circle
                            cx={radius + 8} cy={radius + 8} r={radius} fill="none"
                            stroke={score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={circumference} strokeDashoffset={offset}
                            className="transition-all duration-1000"
                        />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center font-bold ${size === 'md' ? 'text-xl' : 'text-sm'} ${getScoreColor(score)}`}>
                        {score}
                    </span>
                </div>
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
        );
    };

    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/50">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">
                        {t('تقييم المادة:', 'Course Health:')} {subjectName}
                    </h3>
                </div>
                <Button
                    variant="ghost" size="sm"
                    onClick={() => loadReport(true)}
                    disabled={refreshing}
                    className="gap-1 text-xs"
                >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                    {t('تحديث', 'Refresh')}
                </Button>
            </div>

            <div className="p-5 space-y-5">
                {/* Score Circles */}
                <div className="flex items-center justify-around">
                    <ScoreCircle score={report.qualityScore} label={t('الجودة', 'Quality')} />
                    <ScoreCircle score={report.engagementScore} label={t('التفاعل', 'Engagement')} size="sm" />
                    <ScoreCircle score={report.difficultyBalanceScore} label={t('التوازن', 'Balance')} size="sm" />
                </div>

                {/* Risk indicator */}
                <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${report.dropoutRisk >= 50 ? 'bg-red-500/10 text-red-600 dark:text-red-400' : report.dropoutRisk >= 30 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-green-500/10 text-green-600 dark:text-green-400'
                    }`}>
                    <div className="flex items-center gap-2">
                        <TrendingDown className={`w-4 h-4 ${report.dropoutRisk >= 50 ? 'text-red-500' : report.dropoutRisk >= 30 ? 'text-amber-500' : 'text-green-500'
                            }`} />
                        <span className="text-sm font-medium">{t('خطر التسرب', 'Dropout Risk')}</span>
                    </div>
                    <span className="text-sm font-bold">
                        {getRiskLabel(report.dropoutRisk, lang)} ({report.dropoutRisk}%)
                    </span>
                </div>

                {/* Issues */}
                {report.detectedIssues.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-orange-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {t('مشاكل مكتشفة', 'Detected Issues')}
                        </h4>
                        <div className="space-y-1">
                            {report.detectedIssues.map((issue, i) => (
                                <p key={i} className="text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 rounded px-3 py-1.5">{issue}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendations */}
                {report.recommendations.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-blue-700 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            {t('اقتراحات', 'Recommendations')}
                        </h4>
                        <div className="space-y-1">
                            {report.recommendations.map((rec, i) => (
                                <p key={i} className="text-xs text-blue-600 dark:text-blue-400 bg-blue-500/10 rounded px-3 py-1.5">{rec}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* All clear */}
                {report.detectedIssues.length === 0 && report.recommendations.length === 0 && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        {t('لا توجد مشاكل — المادة بحالة ممتازة!', 'No issues — course is in great shape!')}
                    </div>
                )}
            </div>
        </div>
    );
}
