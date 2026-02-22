/**
 * CertificatesManagement — Admin page for managing issued certificates
 *
 * Features:
 * - List all certificates with student and course details
 * - Versioning tracking and revocation status
 * - ADMIN RE-ISSUE: Trigger new version with updated snapshot
 * - Search and filtering
 */

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Certificate } from '@/types/database';
import { reissueCertificate } from '@/lib/certificateGenerator';
import {
    Search,
    RefreshCw,
    Award,
    History,
    ShieldAlert,
    CheckCircle2,
    ExternalLink,
    RotateCcw,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function CertificatesManagement() {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [reissuing, setReissuing] = useState<string | null>(null);

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

    const handleReissue = async (certId: string) => {
        if (!confirm(t('هل أنت متأكد من إعادة إصدار هذه الشهادة؟ سيتم إلغاء النسخة الحالية وإصدار نسخة جديدة ببيانات محدثة.', 'Are you sure you want to re-issue this certificate? The current version will be revoked and a new one issued with updated data.'))) {
            return;
        }

        setReissuing(certId);
        try {
            const { certificate, error } = await reissueCertificate(certId);
            if (error) throw new Error(error);

            toast.success(t('تم إعادة إصدار الشهادة بنجاح', 'Certificate re-issued successfully'));
            fetchCertificates(); // Refresh list
        } catch (err: any) {
            toast.error(t('فشل إعادة الإصدار', 'Re-issue failed'), { description: err.message });
        } finally {
            setReissuing(null);
        }
    };

    const handleRevoke = async (certId: string) => {
        if (!confirm(t('هل أنت متأكد من إلغاء هذه الشهادة؟', 'Are you sure you want to revoke this certificate?'))) {
            return;
        }

        try {
            const { error } = await (supabase.from('certificates') as any)
                .update({ status: 'revoked' })
                .eq('id', certId);

            if (error) throw error;

            toast.success(t('تم إلغاء الشهادة', 'Certificate revoked'));
            fetchCertificates();
        } catch (err: any) {
            toast.error(t('فشل الإلغاء', 'Revocation failed'), { description: err.message });
        }
    };

    const filtered = certificates.filter(c => {
        const query = searchQuery.toLowerCase();
        return (
            c.student_name.toLowerCase().includes(query) ||
            c.course_name.toLowerCase().includes(query) ||
            c.verification_code.toLowerCase().includes(query)
        );
    });

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
            <div className="bg-background border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={t('البحث باسم الطالب أو رقم الشهادة...', 'Search by student name or code...')}
                        className="ps-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
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
                                filtered.map((cert) => (
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
                                            <Badge variant="outline" className="font-mono">
                                                v{cert.version}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            {cert.status === 'issued' ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                                    <CheckCircle2 className="w-3 h-3 me-1" />
                                                    {t('صحيحة', 'Valid')}
                                                </Badge>
                                            ) : cert.status === 'revoked' ? (
                                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">
                                                    <ShieldAlert className="w-3 h-3 me-1" />
                                                    {t('ملغاة', 'Revoked')}
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
                                                {cert.status === 'issued' && (
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
