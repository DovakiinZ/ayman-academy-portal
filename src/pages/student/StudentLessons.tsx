/**
 * StudentLessons — Subject detail page with lesson list + progress
 * Shows subject title, overall progress bar, ordered lesson list,
 * teacher announcements, and certificate claim CTA.
 */

import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLessons } from '@/hooks/useQueryHooks';
import { useCheckSubjectAccess } from '@/hooks/useAcademyData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    Play,
    FileText,
    Lock,
    Clock,
    ArrowLeft,
    ArrowRight,
    Loader2,
    AlertCircle,
    BookOpen,
    CheckCircle,
    Award,
    Megaphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// ── Certificate Claim Hook ────────────────────────────────────────────────────
function useCertificateClaimStatus(subjectId: string | undefined, studentId: string | undefined) {
    return useQuery({
        queryKey: ['cert-claim-status', subjectId, studentId],
        queryFn: async () => {
            if (!subjectId || !studentId) return { canClaim: false, alreadyIssued: false };

            // Check if certificate rule is enabled for this subject
            const { data: rule } = await supabase
                .from('certificate_rules')
                .select('enabled')
                .eq('subject_id', subjectId)
                .eq('enabled', true)
                .maybeSingle();

            if (!rule) return { canClaim: false, alreadyIssued: false };

            // Check if already issued
            const { data: existing } = await supabase
                .from('certificates')
                .select('id, status')
                .eq('subject_id', subjectId)
                .eq('student_id', studentId)
                .eq('status', 'issued')
                .maybeSingle();

            return {
                canClaim: true,
                alreadyIssued: !!existing,
                certId: existing?.id,
            };
        },
        enabled: !!subjectId && !!studentId,
        staleTime: 30 * 1000,
    });
}

// ── Announcements Hook ────────────────────────────────────────────────────────
function useSubjectAnnouncements(subjectId: string | undefined) {
    return useQuery({
        queryKey: ['subject-announcements', subjectId],
        queryFn: async () => {
            const { data } = await supabase
                .from('announcements')
                .select('id, title_ar, title_en, body_ar, body_en, created_at, teacher:profiles!teacher_id(full_name)')
                .eq('subject_id', subjectId!)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(5);
            return data || [];
        },
        enabled: !!subjectId,
        staleTime: 60 * 1000,
    });
}

export default function StudentLessons() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const { t, direction } = useLanguage();
    const { profile } = useAuth();

    const isStudentRole = profile?.role === 'student';
    const { data: accessResult, isLoading: accessLoading } = useCheckSubjectAccess(
        isStudentRole ? profile?.id : undefined,
        isStudentRole ? subjectId : undefined,
    );
    const hasAccess = accessResult?.has_access ?? false;

    const { data: lessonsData, isLoading: loading, error } = useLessons(subjectId, profile?.id);

    const subject = (lessonsData?.subject || null) as any;
    const lessons = (lessonsData?.lessons || []) as any[];

    const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return null;
        const mins = Math.floor(seconds / 60);
        return `${mins} ${t('دقيقة', 'min')}`;
    };

    // Compute progress
    const completedCount = lessons.filter((l: any) => l.progress?.completed_at).length;
    const totalCount = lessons.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Find "Continue" lesson — first incomplete or first lesson
    const continueLesson = lessons.find((l: any) => l.progress && !l.progress.completed_at && l.progress.progress_percent > 0)
        || lessons.find((l: any) => !l.progress?.completed_at)
        || lessons[0];

    if (loading || accessLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Access denied for students
    if (isStudentRole && accessResult && !accessResult.has_access) {
        return (
            <div className="text-center py-12">
                <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                    {t('ليس لديك صلاحية الوصول لهذه المادة', 'You do not have access to this subject')}
                </h2>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    {accessResult.access_type === 'subscription'
                        ? t('هذه المادة تتطلب اشتراك فعال', 'This subject requires an active subscription')
                        : accessResult.access_type === 'invite_only'
                            ? t('هذه المادة بدعوة فقط — تواصل مع المعلم', 'This subject is invite-only — contact your teacher')
                            : t('هذه المادة غير متاحة لك حالياً', 'This subject is not available to you right now')}
                </p>
                <Button variant="outline" onClick={() => navigate('/student/subjects')}>
                    <BackIcon className="w-4 h-4 me-2" />
                    {t('العودة للمواد', 'Back to subjects')}
                </Button>
            </div>
        );
    }

    if (!subject) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                    {t('المادة غير موجودة', 'Subject not found')}
                </h2>
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <BackIcon className="w-4 h-4 me-2" />
                    {t('العودة', 'Go back')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/student/subjects')}
                    className="shrink-0"
                >
                    <BackIcon className="w-4 h-4 me-1" />
                    {t('عودة', 'Back')}
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span>{t(subject.stage?.title_ar || '', subject.stage?.title_en || '')}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {t(subject.title_ar, subject.title_en || subject.title_ar)}
                    </h1>
                </div>
            </div>

            {/* Progress Card */}
            <div className="bg-background border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {completedCount}/{totalCount} {t('دروس مكتملة', 'lessons completed')}
                        </p>
                    </div>
                    <span className="text-sm font-bold text-primary">{progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden mb-4">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${progressPercent === 100 ? 'bg-green-50' : 'bg-primary'}`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                {continueLesson && progressPercent < 100 && (
                    <Link to={`/student/lesson/${continueLesson.id}`}>
                        <Button className="gap-2">
                            <Play className="w-4 h-4 fill-current" />
                            {continueLesson.progress?.progress_percent
                                ? t('متابعة', 'Continue')
                                : t('ابدأ الآن', 'Start Now')}
                        </Button>
                    </Link>
                )}
                {progressPercent === 100 && (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        {t('أكملت جميع الدروس!', 'All lessons completed!')}
                    </div>
                )}

                {/* Certificate Claim CTA */}
                {progressPercent === 100 && profile?.role === 'student' && (
                    <CertificateClaimSection subjectId={subjectId!} studentId={profile.id} t={t} />
                )}
            </div>

            {/* Lessons List */}
            <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground mb-3">
                    {t('الدروس', 'Lessons')}
                </h2>
                {lessons.map((lesson: any, index: number) => {
                    const isCompleted = !!lesson.progress?.completed_at;
                    const hasProgress = (lesson.progress?.progress_percent || 0) > 0;
                    const isCurrent = continueLesson?.id === lesson.id && !isCompleted;

                    return (
                        <Link
                            key={lesson.id}
                            to={`/student/lesson/${lesson.id}`}
                            className={`group flex items-center gap-4 p-4 bg-background rounded-xl border transition-all ${isCurrent
                                ? 'border-primary/50 bg-primary/5 shadow-sm'
                                : 'border-border hover:border-primary/30 hover:shadow-sm'
                                }`}
                        >
                            {/* Status Icon */}
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                                {isCompleted ? (
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                ) : isCurrent ? (
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                        <Play className="w-4 h-4 text-primary-foreground fill-current ms-0.5" />
                                    </div>
                                ) : hasProgress ? (
                                    <div className="w-10 h-10 rounded-full border-2 border-primary/50 flex items-center justify-center">
                                        <span className="text-xs font-bold text-primary">{lesson.progress?.progress_percent}%</span>
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                        <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className={`font-medium transition-colors truncate ${isCurrent ? 'text-primary' : 'text-foreground group-hover:text-primary'
                                        }`}>
                                        {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                    </h3>
                                    {lesson.is_free_preview && (
                                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                                            {t('مجاني', 'Free')}
                                        </Badge>
                                    )}
                                    {lesson.is_paid && !lesson.is_free_preview && (
                                        <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    )}
                                </div>
                                {lesson.summary_ar && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                        {t(lesson.summary_ar, lesson.summary_en || lesson.summary_ar)}
                                    </p>
                                )}
                                <div className="flex items-center gap-3 mt-1">
                                    {lesson.duration_seconds && (
                                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {formatDuration(lesson.duration_seconds)}
                                        </span>
                                    )}
                                    {isCurrent && (
                                        <span className="text-[11px] text-primary font-medium">
                                            {t('التالي ▸', 'Next ▸')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Right icon */}
                            <div className="shrink-0">
                                {isCompleted ? (
                                    <span className="text-xs text-green-600 font-medium">{t('مكتمل', 'Done')}</span>
                                ) : lesson.full_video_url || lesson.preview_video_url || lesson.video_url ? (
                                    <Play className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                ) : (
                                    <FileText className="w-5 h-5 text-muted-foreground" />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Empty State */}
            {lessons.length === 0 && !loading && (
                <div className="bg-background rounded-xl border border-border p-8 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="font-medium text-foreground mb-2">
                        {t('لا توجد دروس متاحة', 'No lessons available')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t('سيتم إضافة الدروس قريباً', 'Lessons will be added soon')}
                    </p>
                </div>
            )}

            {/* Announcements Panel */}
            {subjectId && <AnnouncementsPanel subjectId={subjectId} t={t} />}
        </div>
    );
}

// ── Certificate Claim Section ─────────────────────────────────────────────────
function CertificateClaimSection({
    subjectId, studentId, t
}: { subjectId: string; studentId: string; t: (ar: string, en: string) => string }) {
    const queryClient = useQueryClient();
    const { data: certStatus, isLoading } = useCertificateClaimStatus(subjectId, studentId);

    const claimMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('issue_certificate', {
                p_student_id: studentId,
                p_subject_id: subjectId,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success(t('🎉 تم إصدار شهادتك بنجاح!', '🎉 Your certificate has been issued!'));
            queryClient.invalidateQueries({ queryKey: ['cert-claim-status', subjectId, studentId] });
        },
        onError: (err: any) => {
            toast.error(t('فشل إصدار الشهادة', 'Failed to issue certificate'), { description: err.message });
        },
    });

    if (isLoading || !certStatus?.canClaim) return null;

    return (
        <div className={`mt-4 rounded-xl p-4 border ${certStatus.alreadyIssued
                ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
            }`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Award className={`w-6 h-6 flex-shrink-0 ${certStatus.alreadyIssued ? 'text-green-600' : 'text-amber-600'
                        }`} />
                    <div>
                        <p className={`text-sm font-semibold ${certStatus.alreadyIssued ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'
                            }`}>
                            {certStatus.alreadyIssued
                                ? t('حصلت على شهادة إتمام هذه المادة ✓', 'You have a completion certificate for this subject ✓')
                                : t('مؤهل للحصول على شهادة إتمام!', 'You are eligible for a completion certificate!')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {certStatus.alreadyIssued
                                ? t('يمكنك تحميلها من صفحة شهاداتي', 'Download it from My Certificates page')
                                : t('أكملت جميع الدروس — احصل على شهادتك الآن', 'You completed all lessons — claim your certificate now')}
                        </p>
                    </div>
                </div>
                {certStatus.alreadyIssued ? (
                    <Link to="/student/certificates">
                        <Button size="sm" variant="outline" className="gap-1.5">
                            <Award className="w-4 h-4" />
                            {t('عرض شهاداتي', 'My Certificates')}
                        </Button>
                    </Link>
                ) : (
                    <Button
                        size="sm"
                        className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => claimMutation.mutate()}
                        disabled={claimMutation.isPending}
                    >
                        {claimMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Award className="w-4 h-4" />
                        )}
                        {t('احصل على شهادتك', 'Claim Certificate')}
                    </Button>
                )}
            </div>
        </div>
    );
}

// ── Announcements Panel ───────────────────────────────────────────────────────
function AnnouncementsPanel({
    subjectId, t
}: { subjectId: string; t: (ar: string, en: string) => string }) {
    const { data: announcements = [] } = useSubjectAnnouncements(subjectId);

    if (announcements.length === 0) return null;

    return (
        <div className="bg-background rounded-xl border border-border p-5">
            <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" />
                {t('إعلانات المادة', 'Subject Announcements')}
            </h2>
            <div className="space-y-3">
                {announcements.map((ann: any) => (
                    <div key={ann.id} className="border-s-2 border-primary/40 ps-3">
                        <p className="text-sm font-medium text-foreground">{t(ann.title_ar, ann.title_en || ann.title_ar)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{t(ann.body_ar || '', ann.body_en || ann.body_ar || '')}</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-1">
                            {ann.teacher?.full_name && `${ann.teacher.full_name} · `}
                            {new Date(ann.created_at).toLocaleDateString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
