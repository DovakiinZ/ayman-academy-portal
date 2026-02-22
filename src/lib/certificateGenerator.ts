/**
 * Certificate Generator
 * 
 * Handles: QR generation, PDF creation, Supabase upload, and full issuance flow.
 * Uses client-side rendering for PDF generation (no server needed).
 */

import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { supabase } from './supabase';
import type { Certificate, CertificateSnapshot, Profile } from '@/types/database';
import { evaluateEligibility } from './eligibilityService';

// ============================================
// SNAPSHOT BUILDER
// ============================================

/**
 * Builds an immutable snapshot of student and course data.
 */
export async function buildCertificateSnapshot(
    studentId: string,
    courseName: string,
    score: number | null,
    subjectId?: string,
    lessonId?: string
): Promise<CertificateSnapshot> {
    // 1. Fetch student data
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, gender')
        .eq('id', studentId)
        .single();

    const studentProfile = profile as Profile | null;

    // 2. Fetch teacher name
    let teacherName = 'Academy Teacher';
    if (subjectId) {
        const { data: subject } = await supabase
            .from('subjects')
            .select('teacher_id, profiles(full_name)')
            .eq('id', subjectId)
            .single() as any;

        if (subject?.profiles?.full_name) {
            teacherName = subject.profiles.full_name;
        }
    } else if (lessonId) {
        const { data: lesson } = await supabase
            .from('lessons')
            .select('created_by, profiles(full_name)')
            .eq('id', lessonId)
            .single() as any;

        if (lesson?.profiles?.full_name) {
            teacherName = lesson.profiles.full_name;
        }
    }

    // 3. Fetch Signer & Template Version (defaults)
    let signerName = 'Ayman Academy Admin';
    let templateVersion = '1.0';

    // Try to get signer from settings if available
    const { data: setting } = await (supabase
        .from('system_settings') as any)
        .select('value')
        .eq('key', 'certificate_signer_name')
        .maybeSingle();

    if (setting?.value) {
        signerName = setting.value;
    }

    return {
        student_name: studentProfile?.full_name || 'Student',
        gender: studentProfile?.gender || 'unspecified',
        course_name: courseName,
        score: score,
        completion_date: new Date().toISOString(),
        teacher_name: teacherName,
        signer_name: signerName,
        template_version: templateVersion,
    };
}

// ============================================
// QR CODE
// ============================================

export async function generateQRDataUrl(url: string): Promise<string> {
    return QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: {
            dark: '#1e3a5f',
            light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
    });
}

// ============================================
// VERIFICATION CODE
// ============================================

export function generateVerificationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
        if (i === 3 || i === 7) code += '-';
    }
    return code;
}

// ============================================
// PDF GENERATION
// ============================================

export async function generateCertificatePDF(
    element: HTMLElement
): Promise<Blob> {
    // Render the certificate DOM element to a high-res PNG
    const dataUrl = await toPng(element, {
        width: 1123, // 297mm at 96dpi
        height: 794, // 210mm at 96dpi
        pixelRatio: 2, // 2x for sharp text
        backgroundColor: '#ffffff',
    });

    // Create A4 landscape PDF
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    // A4 landscape: 297mm x 210mm
    pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210);

    return pdf.output('blob');
}

// ============================================
// STORAGE UPLOAD
// ============================================

export async function uploadCertificatePDF(
    blob: Blob,
    certificateId: string
): Promise<string | null> {
    const fileName = `${certificateId}.pdf`;
    const filePath = `certificates/${fileName}`;

    const { error } = await supabase.storage
        .from('certificates')
        .upload(filePath, blob, {
            contentType: 'application/pdf',
            upsert: true,
        });

    if (error) {
        console.error('Failed to upload certificate PDF:', error);
        // Fallback: if bucket doesn't exist, try 'public' bucket
        const { error: fallbackError } = await supabase.storage
            .from('public')
            .upload(`certificates/${fileName}`, blob, {
                contentType: 'application/pdf',
                upsert: true,
            });

        if (fallbackError) {
            console.error('Fallback upload also failed:', fallbackError);
            return null;
        }

        const { data: urlData } = supabase.storage
            .from('public')
            .getPublicUrl(`certificates/${fileName}`);

        return urlData?.publicUrl || null;
    }

    const { data: urlData } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
}

// ============================================
// DUPLICATE CHECK
// ============================================

export async function checkDuplicateCertificate(
    studentId: string,
    lessonId: string
): Promise<Certificate | null> {
    const { data } = await supabase
        .from('certificates')
        .select('*')
        .eq('student_id', studentId)
        .eq('lesson_id', lessonId)
        .eq('status', 'issued')
        .single() as any;

    return data || null;
}

/**
 * Check for existing certificate by subject_id.
 */
export async function checkDuplicateCertificateBySubject(
    studentId: string,
    subjectId: string
): Promise<Certificate | null> {
    const { data } = await supabase
        .from('certificates')
        .select('*')
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .in('status', ['issued', 'pending_approval'])
        .limit(1)
        .single() as any;

    return data || null;
}

// ============================================
// FULL ISSUANCE FLOW
// ============================================

export interface IssueCertificateParams {
    studentId: string;
    studentName: string;
    lessonId: string;
    courseName: string;
    subjectName?: string;
    subjectId?: string;
    score?: number;
}

export async function issueCertificate(
    params: IssueCertificateParams
): Promise<{ certificate: Certificate | null; error: string | null }> {
    const {
        studentId,
        studentName,
        lessonId,
        courseName,
        subjectName,
        subjectId,
        score,
    } = params;

    // 1. Check for duplicate
    const existing = await checkDuplicateCertificate(studentId, lessonId);
    if (existing) {
        return { certificate: existing, error: null };
    }

    // 2. Generate verification code
    const verificationCode = generateVerificationCode();

    // 3. Build Snapshot
    const snapshot = await buildCertificateSnapshot(
        studentId,
        courseName,
        score || null,
        subjectId,
        lessonId
    );

    // 4. Create certificate record
    const { data, error } = await (supabase
        .from('certificates') as any)
        .insert({
            student_id: studentId,
            lesson_id: lessonId,
            subject_id: subjectId || null,
            student_name: studentName,
            course_name: courseName,
            subject_name: subjectName || null,
            score: score || null,
            verification_code: verificationCode,
            status: 'issued',
            version: 1,
            snapshot_json: snapshot,
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to create certificate record:', error);
        return { certificate: null, error: error.message };
    }

    return { certificate: data as Certificate, error: null };
}

/**
 * ADMIN RE-ISSUE FLOW
 */
export async function reissueCertificate(
    certificateId: string
): Promise<{ certificate: Certificate | null; error: string | null }> {
    // 1. Fetch old certificate
    const { data: oldCert, error: fetchError } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', certificateId)
        .single();

    if (fetchError || !oldCert) {
        return { certificate: null, error: 'Certificate not found' };
    }

    const old = oldCert as Certificate;

    // 2. Mark old as revoked
    await (supabase
        .from('certificates') as any)
        .update({ status: 'revoked' })
        .eq('id', certificateId);

    // 3. Build NEW snapshot from latest data
    const snapshot = await buildCertificateSnapshot(
        old.student_id,
        old.course_name,
        old.score,
        old.subject_id || undefined,
        old.lesson_id || undefined
    );

    // 4. Create new version
    const verificationCode = generateVerificationCode();
    const { data: newCert, error: insertError } = await (supabase
        .from('certificates') as any)
        .insert({
            student_id: old.student_id,
            lesson_id: old.lesson_id,
            subject_id: old.subject_id,
            student_name: snapshot.student_name, // Use latest name from snapshot
            course_name: old.course_name,
            subject_name: old.subject_name,
            score: old.score,
            verification_code: verificationCode,
            status: 'issued',
            version: (old.version || 1) + 1,
            reissued_from_id: old.id,
            snapshot_json: snapshot,
        })
        .select()
        .single();

    if (insertError) {
        return { certificate: null, error: insertError.message };
    }

    return { certificate: newCert as Certificate, error: null };
}

// ============================================
// UPDATE PDF URL AFTER GENERATION
// ============================================

export async function updateCertificatePdfUrl(
    certificateId: string,
    pdfUrl: string
): Promise<void> {
    await (supabase
        .from('certificates') as any)
        .update({ pdf_url: pdfUrl })
        .eq('id', certificateId);
}

// ============================================
// RULE-BASED CERTIFICATE REQUEST
// ============================================

export interface RequestCertificateResult {
    certificate: Certificate | null;
    status: 'issued' | 'pending_approval' | 'already_exists' | 'not_eligible';
    error: string | null;
}

/**
 * Rule-based certificate request:
 * 1. Re-check eligibility (never trust frontend)
 * 2. Check for duplicate
 * 3. Insert with appropriate status based on requires_manual_approval
 */
export async function requestCertificate(
    studentId: string,
    studentName: string,
    subjectId: string,
    subjectName: string,
): Promise<RequestCertificateResult> {
    // 1. Check for existing certificate
    const existing = await checkDuplicateCertificateBySubject(studentId, subjectId);
    if (existing) {
        return {
            certificate: existing,
            status: 'already_exists',
            error: null,
        };
    }

    // 2. Re-check eligibility on server side
    const { eligible, rule } = await evaluateEligibility(studentId, subjectId);
    if (!eligible || !rule) {
        return {
            certificate: null,
            status: 'not_eligible',
            error: 'Student does not meet the certificate requirements',
        };
    }

    // 3. Build Snapshot
    const snapshot = await buildCertificateSnapshot(
        studentId,
        subjectName,
        null, // Score might be null if not an exam certificate
        subjectId,
        undefined
    );

    // 4. Determine status
    const certStatus = rule.requires_manual_approval ? 'pending_approval' : 'issued';
    const verificationCode = certStatus === 'issued' ? generateVerificationCode() : '';

    // 5. Insert certificate
    const { data, error } = await (supabase
        .from('certificates') as any)
        .insert({
            student_id: studentId,
            subject_id: subjectId,
            student_name: studentName,
            course_name: subjectName,
            subject_name: subjectName,
            verification_code: verificationCode || generateVerificationCode(),
            status: certStatus,
            version: 1,
            snapshot_json: snapshot,
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to create certificate:', error);
        return { certificate: null, status: 'not_eligible', error: error.message };
    }

    return {
        certificate: data as Certificate,
        status: certStatus,
        error: null,
    };
}
