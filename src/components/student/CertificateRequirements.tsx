/**
 * CertificateRequirements — Student-facing requirements checklist
 *
 * Displays on the subject page to show:
 * - Checklist of requirements with ✅/❌
 * - Current vs required values
 * - "طلب الشهادة" button if eligible
 * - Missing requirements if not
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { evaluateEligibility } from '@/lib/eligibilityService';
import { requestCertificate } from '@/lib/certificateGenerator';
import type { EligibilityResult, CertificateRule, Certificate, MissingRequirement } from '@/types/database';
import { CheckCircle, XCircle, Award, Loader2, Clock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface Props {
    subjectId: string;
    subjectName: string;
}

interface RequirementItem {
    type: string;
    label: string;
    passed: boolean;
    detail: string;
}

export default function CertificateRequirements({ subjectId, subjectName }: Props) {
    const { t } = useLanguage();
    const { profile } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<EligibilityResult | null>(null);
    const [rule, setRule] = useState<CertificateRule | null>(null);
    const [requesting, setRequesting] = useState(false);
    const [existingCert, setExistingCert] = useState<Certificate | null>(null);

    useEffect(() => {
        if (profile?.id && subjectId) {
            checkEligibility();
        }
    }, [profile?.id, subjectId]);

    const checkEligibility = async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            // Check for existing certificate first
            const { data: cert } = await supabase
                .from('certificates')
                .select('*')
                .eq('student_id', profile.id)
                .eq('subject_id', subjectId)
                .in('status', ['issued', 'pending_approval'])
                .limit(1)
                .single() as any;

            if (cert) {
                setExistingCert(cert as Certificate);
                setLoading(false);
                return;
            }

            const eligibility = await evaluateEligibility(profile.id, subjectId);
            setResult(eligibility);
            setRule(eligibility.rule || null);
        } catch (err) {
            console.error('Eligibility check error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRequest = async () => {
        if (!profile?.id || !rule) return;
        setRequesting(true);
        try {
            const res = await requestCertificate(
                profile.id,
                profile.full_name || profile.email || 'طالب',
                subjectId,
                subjectName,
            );

            if (res.status === 'issued') {
                toast.success(t('🎉 تم إصدار الشهادة!', '🎉 Certificate issued!'));
                navigate('/student/certificates');
            } else if (res.status === 'pending_approval') {
                toast.success(t('تم إرسال طلب الشهادة للمراجعة', 'Certificate request sent for review'));
                setExistingCert(res.certificate);
            } else if (res.status === 'already_exists') {
                toast.info(t('الشهادة موجودة بالفعل', 'Certificate already exists'));
                setExistingCert(res.certificate);
            } else {
                toast.error(res.error || t('غير مؤهل للشهادة', 'Not eligible for certificate'));
            }
        } catch (err) {
            console.error('Request cert error:', err);
            toast.error(t('فشل في طلب الشهادة', 'Failed to request certificate'));
        } finally {
            setRequesting(false);
        }
    };

    // Don't render if no rule configured
    if (loading) {
        return (
            <div className="bg-background border border-border rounded-xl p-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Already has certificate
    if (existingCert) {
        return (
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {existingCert.status === 'issued' ? (
                            <Award className="w-5 h-5 text-primary" />
                        ) : (
                            <Clock className="w-5 h-5 text-amber-500" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">
                            {existingCert.status === 'issued'
                                ? t('تم إصدار الشهادة ✅', 'Certificate Issued ✅')
                                : t('بانتظار الموافقة ⏳', 'Pending Approval ⏳')
                            }
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {existingCert.status === 'issued'
                                ? t('يمكنك عرضها وتحميلها من صفحة شهاداتي', 'View and download from My Certificates')
                                : t('سيتم مراجعة طلبك والموافقة عليه قريباً', 'Your request will be reviewed soon')
                            }
                        </p>
                    </div>
                </div>
                {existingCert.status === 'issued' && (
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate('/student/certificates')}>
                        <Award className="w-4 h-4" />
                        {t('عرض الشهادة', 'View Certificate')}
                    </Button>
                )}
            </div>
        );
    }

    // No rule configured for this subject
    if (!rule) {
        return null;
    }

    // Build checklist items from rule_json
    const items = buildChecklistFromRule(rule.rule_json, result?.missingRequirements || [], t);

    return (
        <div className="bg-background border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">
                        {t('متطلبات الشهادة', 'Certificate Requirements')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t('أكمل المتطلبات التالية للحصول على الشهادة', 'Complete the following to earn your certificate')}
                    </p>
                </div>
            </div>

            {/* Requirements Checklist */}
            <div className="space-y-2">
                {items.map((item, i) => (
                    <div
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${item.passed
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30'
                                : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/30'
                            }`}
                    >
                        {item.passed ? (
                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${item.passed ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                                {item.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action */}
            {result?.eligible ? (
                <Button
                    onClick={handleRequest}
                    disabled={requesting}
                    className="w-full gap-2"
                    size="lg"
                >
                    {requesting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('جاري الطلب...', 'Requesting...')}
                        </>
                    ) : (
                        <>
                            <Award className="w-4 h-4" />
                            {t('طلب الشهادة', 'Request Certificate')}
                        </>
                    )}
                </Button>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                    {t('أكمل جميع المتطلبات أعلاه للحصول على الشهادة', 'Complete all requirements above to earn your certificate')}
                </p>
            )}
        </div>
    );
}

// ── Helper: Build checklist items from rule tree ──

function buildChecklistFromRule(
    node: any,
    missing: MissingRequirement[],
    t: (ar: string, en: string) => string
): RequirementItem[] {
    const items: RequirementItem[] = [];

    if (node.type === 'AND' || node.type === 'OR') {
        for (const child of node.rules || []) {
            items.push(...buildChecklistFromRule(child, missing, t));
        }
    } else if (node.type === 'progress') {
        const m = missing.find(r => r.type === 'progress');
        const passed = !m;
        items.push({
            type: 'progress',
            label: t(`إكمال ${node.minPercent}% من الدروس`, `Complete ${node.minPercent}% of lessons`),
            passed,
            detail: passed
                ? t('مكتمل ✓', 'Completed ✓')
                : t(`الحالي: ${m!.current}% — المطلوب: ${m!.required}%`, `Current: ${m!.current}% — Required: ${m!.required}%`),
        });
    } else if (node.type === 'final_exam') {
        const m = missing.find(r => r.type === 'final_exam');
        const passed = !m;
        items.push({
            type: 'final_exam',
            label: t(`اجتياز الامتحان النهائي (${node.minScore}%)`, `Pass final exam (${node.minScore}%)`),
            passed,
            detail: passed
                ? t('تم الاجتياز ✓', 'Passed ✓')
                : t(`الحالي: ${m!.current}% — المطلوب: ${m!.required}%`, `Current: ${m!.current}% — Required: ${m!.required}%`),
        });
    } else if (node.type === 'assignment_approved') {
        const m = missing.find(r => r.type === 'assignment_approved');
        const passed = !m;
        items.push({
            type: 'assignment_approved',
            label: t('موافقة المعلم على الواجب', 'Teacher assignment approval'),
            passed,
            detail: passed
                ? t('تمت الموافقة ✓', 'Approved ✓')
                : t('بانتظار الموافقة', 'Pending approval'),
        });
    }

    return items;
}
