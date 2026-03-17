/**
 * CertificateRulesConfig — Admin panel for configuring certificate rules per subject
 *
 * Features:
 * - Enable/disable certificate for a subject
 * - Configure rules: min progress %, min exam score, require assignment approval
 * - Toggle require manual approval
 * - Saves as rule_json with AND logic
 */

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { CertificateRule, RuleNode } from '@/types/database';
import { Loader2, Save, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Props {
    subjectId: string;
}

interface RuleFormState {
    enabled: boolean;
    requiresManualApproval: boolean;
    progressEnabled: boolean;
    progressMin: number;
    examEnabled: boolean;
    examMinScore: number;
    assignmentEnabled: boolean;
}

function ruleJsonToForm(rule: CertificateRule | null): RuleFormState {
    const defaults: RuleFormState = {
        enabled: false,
        requiresManualApproval: false,
        progressEnabled: true,
        progressMin: 100,
        examEnabled: false,
        examMinScore: 70,
        assignmentEnabled: false,
    };

    if (!rule) return defaults;

    defaults.enabled = rule.enabled;
    defaults.requiresManualApproval = rule.requires_manual_approval;

    const json = rule.rule_json as any;
    if (json?.type === 'AND' && Array.isArray(json.rules)) {
        for (const r of json.rules) {
            if (r.type === 'progress') {
                defaults.progressEnabled = true;
                defaults.progressMin = r.minPercent || 100;
            } else if (r.type === 'final_exam') {
                defaults.examEnabled = true;
                defaults.examMinScore = r.minScore || 70;
            } else if (r.type === 'assignment_approved') {
                defaults.assignmentEnabled = r.required ?? true;
            }
        }
    }

    return defaults;
}

function formToRuleJson(form: RuleFormState): RuleNode {
    const rules: any[] = [];

    if (form.progressEnabled) {
        rules.push({ type: 'progress', minPercent: form.progressMin });
    }
    if (form.examEnabled) {
        rules.push({ type: 'final_exam', minScore: form.examMinScore });
    }
    if (form.assignmentEnabled) {
        rules.push({ type: 'assignment_approved', required: true });
    }

    // Default: at least progress 100%
    if (rules.length === 0) {
        rules.push({ type: 'progress', minPercent: 100 });
    }

    return { type: 'AND', rules };
}

export default function CertificateRulesConfig({ subjectId }: Props) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [existingId, setExistingId] = useState<string | null>(null);
    const [form, setForm] = useState<RuleFormState>(ruleJsonToForm(null));

    useEffect(() => {
        if (subjectId) fetchRule();
    }, [subjectId]);

    const fetchRule = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('certificate_rules')
                .select('*')
                .eq('subject_id', subjectId)
                .single() as any;

            if (data) {
                setExistingId(data.id);
                setForm(ruleJsonToForm(data as CertificateRule));
            }
        } catch (err) {
            // No rule exists yet — that's fine
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const ruleJson = formToRuleJson(form);

            if (existingId) {
                const { error } = await (supabase
                    .from('certificate_rules') as any)
                    .update({
                        enabled: form.enabled,
                        requires_manual_approval: form.requiresManualApproval,
                        rule_json: ruleJson,
                    })
                    .eq('id', existingId);

                if (error) throw error;
            } else {
                const { data, error } = await (supabase
                    .from('certificate_rules') as any)
                    .insert({
                        subject_id: subjectId,
                        enabled: form.enabled,
                        requires_manual_approval: form.requiresManualApproval,
                        rule_json: ruleJson,
                    })
                    .select()
                    .single();

                if (error) throw error;
                if (data) setExistingId(data.id);
            }

            toast.success(t('تم حفظ إعدادات الشهادة', 'Certificate settings saved'));
        } catch (err) {
            console.error('Save rule error:', err);
            toast.error(t('فشل حفظ الإعدادات', 'Failed to save settings'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">
                            {t('إعدادات الشهادة', 'Certificate Settings')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {t('إدارة متطلبات إصدار الشهادة لهذه المادة', 'Manage certificate requirements for this subject')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Enable toggle */}
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                    {form.enabled ? (
                        <ToggleRight className="w-5 h-5 text-primary" />
                    ) : (
                        <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                        <Label className="text-sm font-medium">
                            {t('تفعيل الشهادة', 'Enable Certificate')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            {t('السماح للطلاب بطلب شهادة لهذه المادة', 'Allow students to request a certificate for this subject')}
                        </p>
                    </div>
                </div>
                <Switch
                    checked={form.enabled}
                    onCheckedChange={(v) => setForm(f => ({ ...f, enabled: v }))}
                />
            </div>

            {form.enabled && (
                <div className="space-y-5 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    {/* Manual approval */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium">
                                {t('يتطلب موافقة يدوية', 'Require Manual Approval')}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {t('يجب أن يوافق المسؤول قبل إصدار الشهادة', 'Admin must approve before certificate is issued')}
                            </p>
                        </div>
                        <Switch
                            checked={form.requiresManualApproval}
                            onCheckedChange={(v) => setForm(f => ({ ...f, requiresManualApproval: v }))}
                        />
                    </div>

                    <hr className="border-border" />

                    {/* Progress rule */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                                {t('نسبة الإكمال المطلوبة', 'Required Completion %')}
                            </Label>
                            <Switch
                                checked={form.progressEnabled}
                                onCheckedChange={(v) => setForm(f => ({ ...f, progressEnabled: v }))}
                            />
                        </div>
                        {form.progressEnabled && (
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={form.progressMin}
                                    onChange={(e) => setForm(f => ({ ...f, progressMin: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                                    className="w-24"
                                />
                                <span className="text-sm text-muted-foreground">%</span>
                            </div>
                        )}
                    </div>

                    {/* Final exam rule */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                                {t('الحد الأدنى لدرجة الامتحان', 'Minimum Exam Score')}
                            </Label>
                            <Switch
                                checked={form.examEnabled}
                                onCheckedChange={(v) => setForm(f => ({ ...f, examEnabled: v }))}
                            />
                        </div>
                        {form.examEnabled && (
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={form.examMinScore}
                                    onChange={(e) => setForm(f => ({ ...f, examMinScore: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                                    className="w-24"
                                />
                                <span className="text-sm text-muted-foreground">%</span>
                            </div>
                        )}
                    </div>

                    {/* Assignment approval rule */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium">
                                {t('يتطلب موافقة على الواجب', 'Require Assignment Approval')}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {t('يجب أن يوافق المعلم على الواجب', 'Teacher must approve the assignment')}
                            </p>
                        </div>
                        <Switch
                            checked={form.assignmentEnabled}
                            onCheckedChange={(v) => setForm(f => ({ ...f, assignmentEnabled: v }))}
                        />
                    </div>
                </div>
            )}

            {/* Save button */}
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Save className="w-4 h-4" />
                )}
                {t('حفظ الإعدادات', 'Save Settings')}
            </Button>
        </div>
    );
}
