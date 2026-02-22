import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLinkedStudents, getStudentReport, linkStudent } from '@/lib/parentDashboardService';
import type { ParentLink, ParentStudentReport } from '@/types/database';
import {
    Loader2, Users, BookOpen, Award, Clock, TrendingUp,
    TrendingDown, Plus, UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function ParentDashboard() {
    const { profile } = useAuth();
    const { t } = useLanguage();
    const [students, setStudents] = useState<ParentLink[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [report, setReport] = useState<ParentStudentReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [reportLoading, setReportLoading] = useState(false);
    const [linkEmail, setLinkEmail] = useState('');
    const [linking, setLinking] = useState(false);
    const [showLinkForm, setShowLinkForm] = useState(false);

    useEffect(() => {
        if (!profile?.id) return;
        (async () => {
            const data = await getLinkedStudents(profile.id);
            setStudents(data);
            if (data.length > 0) {
                setSelectedStudentId(data[0].student_id);
            }
            setLoading(false);
        })();
    }, [profile?.id]);

    useEffect(() => {
        if (!profile?.id || !selectedStudentId) return;
        (async () => {
            setReportLoading(true);
            const data = await getStudentReport(profile.id, selectedStudentId);
            setReport(data);
            setReportLoading(false);
        })();
    }, [profile?.id, selectedStudentId]);

    const handleLinkStudent = async () => {
        if (!profile?.id || !linkEmail.trim()) return;
        setLinking(true);
        const result = await linkStudent(profile.id, linkEmail.trim());
        if (result.success) {
            toast.success(t('تم ربط الطالب بنجاح', 'Student linked successfully'));
            setLinkEmail('');
            setShowLinkForm(false);
            const data = await getLinkedStudents(profile.id);
            setStudents(data);
            if (!selectedStudentId && data.length > 0) {
                setSelectedStudentId(data[0].student_id);
            }
        } else {
            toast.error(result.error);
        }
        setLinking(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const selectedStudent = students.find(s => s.student_id === selectedStudentId);

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('لوحة تحكم ولي الأمر', 'Parent Dashboard')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('تابع أداء أبنائك', 'Track your children\'s performance')}
                    </p>
                </div>
                <Button
                    variant="outline" size="sm"
                    className="gap-2"
                    onClick={() => setShowLinkForm(!showLinkForm)}
                >
                    <UserPlus className="w-4 h-4" />
                    {t('إضافة طالب', 'Link Student')}
                </Button>
            </div>

            {/* Link Student Form */}
            {showLinkForm && (
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                    <p className="text-sm font-medium text-blue-800 mb-2">
                        {t('أدخل البريد الإلكتروني للطالب', 'Enter student email')}
                    </p>
                    <div className="flex gap-2">
                        <Input
                            type="email"
                            value={linkEmail}
                            onChange={(e) => setLinkEmail(e.target.value)}
                            placeholder={t('email@example.com', 'email@example.com')}
                            className="flex-1"
                        />
                        <Button onClick={handleLinkStudent} disabled={linking} size="sm">
                            {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            )}

            {/* Student Selector */}
            {students.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {students.map(s => (
                        <button
                            key={s.student_id}
                            onClick={() => setSelectedStudentId(s.student_id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedStudentId === s.student_id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-white border border-border text-foreground hover:bg-secondary'
                                }`}
                        >
                            {(s.student as any)?.full_name || (s.student as any)?.email || t('طالب', 'Student')}
                        </button>
                    ))}
                </div>
            )}

            {/* No students */}
            {students.length === 0 && (
                <div className="bg-white rounded-xl border border-border p-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground mb-2">
                        {t('لم يتم ربط أي طالب بعد', 'No students linked yet')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {t('أضف طالباً عبر بريده الإلكتروني لمتابعة أدائه', 'Link a student via email to track their performance')}
                    </p>
                </div>
            )}

            {/* Report */}
            {selectedStudentId && (
                reportLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : report ? (
                    <div className="space-y-4">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard
                                icon={<BookOpen className="w-5 h-5 text-blue-500" />}
                                label={t('التقدم العام', 'Overall Progress')}
                                value={`${report.progressPercent}%`}
                                bg="bg-blue-50"
                            />
                            <StatCard
                                icon={<Award className="w-5 h-5 text-green-500" />}
                                label={t('متوسط الدرجات', 'Avg Score')}
                                value={`${report.avgScore}%`}
                                bg="bg-green-50"
                            />
                            <StatCard
                                icon={<Clock className="w-5 h-5 text-purple-500" />}
                                label={t('دروس الأسبوع', 'Weekly Lessons')}
                                value={`${report.weeklyLessonsCompleted}`}
                                bg="bg-purple-50"
                            />
                            <StatCard
                                icon={<Clock className="w-5 h-5 text-amber-500" />}
                                label={t('الوقت (أسبوعي)', 'Time (Weekly)')}
                                value={`${report.timeSpentMinutes} ${t('دقيقة', 'min')}`}
                                bg="bg-amber-50"
                            />
                        </div>

                        {/* Comparison */}
                        <div className={`rounded-xl p-4 border ${report.comparisonToClassAverage >= 0
                                ? 'bg-green-50 border-green-200'
                                : 'bg-orange-50 border-orange-200'
                            }`}>
                            <div className="flex items-center gap-2">
                                {report.comparisonToClassAverage >= 0 ? (
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                ) : (
                                    <TrendingDown className="w-5 h-5 text-orange-600" />
                                )}
                                <p className={`text-sm font-medium ${report.comparisonToClassAverage >= 0 ? 'text-green-800' : 'text-orange-800'
                                    }`}>
                                    {report.comparisonToClassAverage >= 0
                                        ? t(
                                            `أداء ابنك أعلى من المتوسط بـ ${report.comparisonToClassAverage}%`,
                                            `Your child is ${report.comparisonToClassAverage}% above average`
                                        )
                                        : t(
                                            `أداء ابنك أقل من المتوسط بـ ${Math.abs(report.comparisonToClassAverage)}%`,
                                            `Your child is ${Math.abs(report.comparisonToClassAverage)}% below average`
                                        )
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {report.strengths.length > 0 && (
                                <div className="bg-white rounded-xl border border-border p-4">
                                    <h3 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-1">
                                        <TrendingUp className="w-4 h-4" />
                                        {t('نقاط القوة', 'Strengths')}
                                    </h3>
                                    {report.strengths.map((s, i) => (
                                        <p key={i} className="text-sm text-green-600 bg-green-50 rounded px-3 py-1.5 mb-1">{s}</p>
                                    ))}
                                </div>
                            )}
                            {report.weaknesses.length > 0 && (
                                <div className="bg-white rounded-xl border border-border p-4">
                                    <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center gap-1">
                                        <TrendingDown className="w-4 h-4" />
                                        {t('يحتاج دعم في', 'Needs Support In')}
                                    </h3>
                                    {report.weaknesses.map((w, i) => (
                                        <p key={i} className="text-sm text-orange-600 bg-orange-50 rounded px-3 py-1.5 mb-1">{w}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : null
            )}
        </div>
    );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
    return (
        <div className={`${bg} rounded-xl border border-border/50 p-4`}>
            <div className="flex items-center gap-2 mb-2">{icon}</div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
    );
}
