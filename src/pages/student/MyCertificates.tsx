import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import {
    generateQRDataUrl,
    generateCertificatePDF,
    uploadCertificatePDF,
    updateCertificatePdfUrl,
} from '@/lib/certificateGenerator';
import CertificateTemplate from '@/components/certificate/CertificateTemplate';
import type { Certificate } from '@/types/database';
import { Loader2, Download, ExternalLink, Award, FileCheck, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

export default function MyCertificates() {
    const { t } = useLanguage();
    const { profile } = useAuth();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);

    // Hidden certificate renderer
    const certRef = useRef<HTMLDivElement>(null);
    const [renderCert, setRenderCert] = useState<Certificate | null>(null);
    const [renderQR, setRenderQR] = useState<string>('');

    useEffect(() => {
        if (profile?.id) fetchCertificates();
    }, [profile?.id]);

    const fetchCertificates = async () => {
        const { data, error } = await supabase
            .from('certificates')
            .select('*')
            .eq('student_id', profile!.id)
            .order('issued_at', { ascending: false }) as any;

        if (error) {
            console.error('Error fetching certificates:', error);
        } else {
            setCertificates(data || []);
        }
        setLoading(false);
    };

    const handleDownload = useCallback(async (cert: Certificate) => {
        // If PDF already exists, just download it
        if (cert.pdf_url) {
            window.open(cert.pdf_url, '_blank');
            return;
        }

        // Generate PDF on-the-fly
        setGenerating(cert.id);
        try {
            // Generate QR
            const verifyUrl = `${window.location.origin}/verify/${cert.verification_code}`;
            const qrDataUrl = await generateQRDataUrl(verifyUrl);

            // Set state to render the hidden template
            setRenderCert(cert);
            setRenderQR(qrDataUrl);

            // Wait for the component to render
            await new Promise(resolve => setTimeout(resolve, 500));

            if (!certRef.current) {
                toast.error(t('فشل إنشاء الشهادة', 'Failed to generate certificate'));
                return;
            }

            // Generate PDF
            const pdfBlob = await generateCertificatePDF(certRef.current);

            // Upload to storage
            const pdfUrl = await uploadCertificatePDF(pdfBlob, cert.id);

            if (pdfUrl) {
                await updateCertificatePdfUrl(cert.id, pdfUrl);
                // Update local state
                setCertificates(prev =>
                    prev.map(c => c.id === cert.id ? { ...c, pdf_url: pdfUrl } : c)
                );
                window.open(pdfUrl, '_blank');
            } else {
                // Fallback: download directly from blob
                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `certificate-${cert.verification_code}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            }

            toast.success(t('تم تحميل الشهادة', 'Certificate downloaded'));
        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error(t('فشل إنشاء الشهادة', 'Failed to generate certificate'));
        } finally {
            setGenerating(null);
            setRenderCert(null);
        }
    }, [t]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <Award className="w-7 h-7 text-primary" />
                    {t('شهاداتي', 'My Certificates')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {t('جميع شهادات الإتمام التي حصلت عليها', 'All completion certificates you have earned')}
                </p>
            </div>

            {certificates.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-xl border border-border">
                    <Award className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('لا توجد شهادات بعد', 'No Certificates Yet')}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        {t(
                            'أكمل الدروس واجتز الاختبارات للحصول على شهادات إتمام رسمية.',
                            'Complete lessons and pass quizzes to earn official completion certificates.'
                        )}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {certificates.map(cert => (
                        <div
                            key={cert.id}
                            className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        >
                            {/* Card Header */}
                            <div className="bg-gradient-to-l from-primary/5 to-primary/10 px-5 py-4 border-b border-border">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-foreground truncate">
                                            {cert.course_name}
                                        </h3>
                                        {cert.subject_name && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {cert.subject_name}
                                            </p>
                                        )}
                                    </div>
                                    <Badge
                                        variant={cert.status === 'valid' ? 'default' : 'destructive'}
                                        className="shrink-0 ms-2"
                                    >
                                        {cert.status === 'valid'
                                            ? t('سارية', 'Valid')
                                            : t('ملغاة', 'Revoked')
                                        }
                                    </Badge>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CalendarDays className="w-4 h-4 shrink-0" />
                                    {new Date(cert.issued_at).toLocaleDateString('ar-EG', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </div>

                                {cert.score !== null && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <FileCheck className="w-4 h-4 shrink-0" />
                                        {t('الدرجة:', 'Score:')} <strong className="text-foreground">{cert.score}%</strong>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        className="flex-1 gap-1.5"
                                        onClick={() => handleDownload(cert)}
                                        disabled={generating === cert.id}
                                    >
                                        {generating === cert.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Download className="w-3.5 h-3.5" />
                                        )}
                                        {t('تحميل', 'Download')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5"
                                        onClick={() => window.open(`/verify/${cert.verification_code}`, '_blank')}
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        {t('تحقق', 'Verify')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Hidden renderer for PDF generation */}
            {renderCert && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                    <CertificateTemplate
                        ref={certRef}
                        studentName={renderCert.student_name}
                        courseName={renderCert.course_name}
                        subjectName={renderCert.subject_name || undefined}
                        score={renderCert.score || undefined}
                        issuedDate={renderCert.issued_at}
                        certificateId={renderCert.id}
                        verificationCode={renderCert.verification_code}
                        qrDataUrl={renderQR}
                        logoUrl={logo}
                    />
                </div>
            )}
        </div>
    );
}
