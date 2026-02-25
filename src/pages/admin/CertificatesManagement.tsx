/**
 * CertificatesManagement — Admin page for managing issued certificates
 *
 * Features:
 * - List all certificates with student and course details
 * - Versioning tracking and revocation status
 * - ADMIN RE-ISSUE via server-side RPC (secure, builds fresh snapshot)
 * - ADMIN APPROVE for pending_approval certificates
 * - ADMIN REVOKE via server-side RPC
 * - Search, status filtering, version timeline
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { Certificate } from '@/types/database';
import {
    reissueCertificateViaRPC,
    approveCertificateViaRPC,
    revokeCertificateViaRPC,
} from '@/lib/certificateGenerator';
import {
    Search,
    RefreshCw,
    Award,
    ShieldAlert,
    CheckCircle2,
    ExternalLink,
    RotateCcw,
    Loader2,
    Clock,
    Filter,
    ChevronDown,
    ChevronUp,
    ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'issued' | 'pending_approval' | 'revoked';

export default function CertificatesManagement() {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [reissuing, setReissuing] = useState<string | null>(null);
    const [approving, setApproving] = useState<string | null>(null);
    const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('certificates')
                .select('*')
                .order('issued_at', { ascending: false });

            if (error) throw error;
            setCertificates((data as Certificate[]) || []);
        } catch (err: any) {
            toast.error(t('فشل تحميل الشهادات', 'Failed to load certificates'), { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    // ── Admin Re-issue via RPC ─────────────────
    const handleReissue = async (certId: string) => {
        const reason = prompt(
            t(
                'أدخل سبب إعادة الإصدار (اختياري):',
                'Enter reason for re-issue (optional):'
            )
        );
        if (reason === null) return; // User cancelled

        setReissuing(certId);
        try {
            const { certificate, error } = await reissueCertificateViaRPC(certId, reason || undefined);
            if (error) throw new Error(error);

            toast.success(t('تم إعادة إصدار الشهادة بنجاح', 'Certificate re-issued successfully'));
            fetchCertificates();
        } catch (err: any) {
            toast.error(t('فشل إعادة الإصدار', 'Re-issue failed'), { description: err.message });
        } finally {
            setReissuing(null);
        }
    };

    // ── Admin Approve via RPC ──────────────────
    const handleApprove = async (certId: string) => {
        setApproving(certId);
        try {
            const { success, error } = await approveCertificateViaRPC(certId);
            if (!success) throw new Error(error || 'Unknown error');

            toast.success(t('تم قبول الشهادة', 'Certificate approved'));
            fetchCertificates();
        } catch (err: any) {
            toast.error(t('فشل القبول', 'Approval failed'), { description: err.message });
        } finally {
            setApproving(null);
        }
    };

    // ── Admin Revoke via RPC ───────────────────
    const handleRevoke = async (certId: string) => {
        if (!confirm(t('هل أنت متأكد من إلغاء هذه الشهادة؟', 'Are you sure you want to revoke this certificate?'))) {
            return;
        }

        try {
            const { success, error } = await revokeCertificateViaRPC(certId);
            if (!success) throw new Error(error || 'Unknown error');

            toast.success(t('تم إلغاء الشهادة', 'Certificate revoked'));
            fetchCertificates();
        } catch (err: any) {
            toast.error(t('فشل الإلغاء', 'Revocation failed'), { description: err.message });
        }
    };

    // ── Version timeline (children of the same certificate chain) ──
    const getVersionChain = (certId: string): Certificate[] => {
        const chain: Certificate[] = [];
        // Find all certs in this chain
        const cert = certificates.find(c => c.id === certId);
        if (!cert) return [];

        // Find forward chain (newer versions that point back to this)
        const findNewer = (id: string) => {
            const newer = certificates.filter(c => c.reissued_from_id === id);
            newer.forEach(n => {
                chain.push(n);
                findNewer(n.id);
            });
        };

        // Find backward chain (older versions)
        const findOlder = (id: string | null) => {
            if (!id) return;
            const older = certificates.find(c => c.id === id);
            if (older) {
                chain.unshift(older);
                findOlder(older.reissued_from_id);
            }
        };

        findOlder(cert.reissued_from_id);
        chain.push(cert);
        findNewer(cert.id);

        return chain;
    };

    // ── Filtering ──
    const filtered = certificates.filter(c => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
            c.student_name.toLowerCase().includes(query) ||
            c.course_name.toLowerCase().includes(query) ||
            c.verification_code.toLowerCase().includes(query)
        );
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Count by status for filter badges
    const countByStatus = (status: string) => certificates.filter(c => c.status === status).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                        <Award className="w-6 h-6 text-primary" />
                        {t('إدارة الشهادات', 'Certificates Management')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('عرض وإعادة إصدار وإلغاء الشهادات المصدرة', 'View, re-issue, and revoke issued certificates')}
                    </p>
                </div>
                <Button variant="outline" onClick={fetchCertificates} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 me-2 ${loading ? 'animate-spin' : ''}`} />
                    {t('تحديث', 'Refresh')}
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-background border border-border rounded-xl p-4 shadow-sm space-y-3">
                <div className="relative flex-1">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={t('البحث باسم الطالب أو رقم الشهادة...', 'Search by student name or code...')}
                        className="ps-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant={statusFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('all')}
                        className="gap-1.5"
                    >
                        <Filter className="w-3.5 h-3.5" />
                        {t('الكل', 'All')} ({certificates.length})
                    </Button>
                    <Button
                        size="sm"
                        variant={statusFilter === 'issued' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('issued')}
                        className="gap-1.5"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('صادرة', 'Issued')} ({countByStatus('issued')})
                    </Button>
                    <Button
                        size="sm"
                        variant={statusFilter === 'pending_approval' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('pending_approval')}
                        className="gap-1.5"
                    >
                        <Clock className="w-3.5 h-3.5" />
                        {t('بانتظار الموافقة', 'Pending')} ({countByStatus('pending_approval')})
                    </Button>
                    <Button
                        size="sm"
                        variant={statusFilter === 'revoked' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('revoked')}
                        className="gap-1.5"
                    >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {t('ملغاة', 'Revoked')} ({countByStatus('revoked')})
                    </Button>
                </div>
            </div>

            {/* List */}
            <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-start">
                        <thead className="bg-secondary/30 text-muted-foreground font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-4 text-start font-semibold">{t('الطالب', 'Student')}</th>
                                <th className="px-6 py-4 text-start font-semibold">{t('الدورة / المادة', 'Course / Subject')}</th>
                                <th className="px-6 py-4 text-start font-semibold">{t('الإصدار', 'Version')}</th>
                                <th className="px-6 py-4 text-start font-semibold">{t('الحالة', 'Status')}</th>
                                <th className="px-6 py-4 text-start font-semibold">{t('تاريخ الإصدار', 'Date')}</th>
                                <th className="px-6 py-4 text-end font-semibold">{t('إجراءات', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4">
                                            <div className="h-4 bg-muted rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        {t('لا توجد شهادات مطابقة', 'No matching certificates found')}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((cert) => {
                                    const versionChain = getVersionChain(cert.id);
                                    const hasVersionHistory = versionChain.length > 1;
                                    const isExpanded = expandedVersion === cert.id;

                                    return (
                                        <>
                                            <tr key={cert.id} className="hover:bg-secondary/10 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-foreground">{cert.student_name}</div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">{cert.verification_code}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-foreground">{cert.course_name}</div>
                                                    {cert.subject_name && (
                                                        <div className="text-xs text-muted-foreground">{cert.subject_name}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge variant="outline" className="font-mono">
                                                            v{cert.version || 1}
                                                        </Badge>
                                                        {hasVersionHistory && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0"
                                                                onClick={() => setExpandedVersion(isExpanded ? null : cert.id)}
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                                ) : (
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {cert.status === 'issued' ? (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                                            <CheckCircle2 className="w-3 h-3 me-1" />
                                                            {t('صادرة', 'Issued')}
                                                        </Badge>
                                                    ) : cert.status === 'revoked' ? (
                                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">
                                                            <ShieldAlert className="w-3 h-3 me-1" />
                                                            {t('ملغاة', 'Revoked')}
                                                        </Badge>
                                                    ) : cert.status === 'pending_approval' ? (
                                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                                                            <Clock className="w-3 h-3 me-1" />
                                                            {t('بانتظار الموافقة', 'Pending')}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="capitalize">
                                                            {cert.status}
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {new Date(cert.issued_at).toLocaleDateString('ar-EG')}
                                                </td>
                                                <td className="px-6 py-4 text-end">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <a href={`/verify/${cert.verification_code}`} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        </Button>

                                                        {/* Approve button for pending */}
                                                        {cert.status === 'pending_approval' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-green-600 border-green-200 hover:bg-green-50"
                                                                onClick={() => handleApprove(cert.id)}
                                                                disabled={approving === cert.id}
                                                            >
                                                                {approving === cert.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <ShieldCheck className="w-4 h-4 me-1.5" />
                                                                )}
                                                                {t('قبول', 'Approve')}
                                                            </Button>
                                                        )}

                                                        {/* Re-issue button */}
                                                        {cert.status === 'issued' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                                                onClick={() => handleReissue(cert.id)}
                                                                disabled={reissuing === cert.id}
                                                            >
                                                                {reissuing === cert.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <RotateCcw className="w-4 h-4 me-1.5" />
                                                                )}
                                                                {t('إعادة إصدار', 'Re-issue')}
                                                            </Button>
                                                        )}

                                                        {/* Revoke button */}
                                                        {(cert.status === 'issued' || cert.status === 'pending_approval') && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:bg-destructive/10"
                                                                onClick={() => handleRevoke(cert.id)}
                                                            >
                                                                <ShieldAlert className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Version timeline */}
                                            {isExpanded && hasVersionHistory && (
                                                <tr key={`${cert.id}-versions`}>
                                                    <td colSpan={6} className="px-6 py-3 bg-muted/30">
                                                        <div className="text-xs font-semibold text-muted-foreground mb-2">
                                                            {t('سجل الإصدارات', 'Version History')}
                                                        </div>
                                                        <div className="space-y-1">
                                                            {versionChain.map((vc, idx) => (
                                                                <div
                                                                    key={vc.id}
                                                                    className={`flex items-center gap-3 text-xs py-1.5 px-3 rounded ${vc.id === cert.id ? 'bg-primary/5 font-medium' : ''
                                                                        }`}
                                                                >
                                                                    <Badge variant="outline" className="font-mono text-[10px] h-5">
                                                                        v{vc.version || 1}
                                                                    </Badge>
                                                                    <span className={vc.status === 'revoked' ? 'line-through text-muted-foreground' : ''}>
                                                                        {vc.student_name}
                                                                    </span>
                                                                    <span className="text-muted-foreground">
                                                                        {new Date(vc.issued_at).toLocaleDateString('ar-EG')}
                                                                    </span>
                                                                    <Badge
                                                                        variant={vc.status === 'issued' ? 'default' : vc.status === 'revoked' ? 'destructive' : 'secondary'}
                                                                        className="text-[10px] h-5"
                                                                    >
                                                                        {vc.status}
                                                                    </Badge>
                                                                    {vc.snapshot_json?.reissue_reason && (
                                                                        <span className="text-muted-foreground italic">
                                                                            {t('السبب:', 'Reason:')} {vc.snapshot_json.reissue_reason}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
