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
import type { Certificate } from '@/types/database';

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
        .eq('status', 'valid')
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

    // 3. Create certificate record
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
            status: 'valid',
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to create certificate record:', error);
        return { certificate: null, error: error.message };
    }

    return { certificate: data as Certificate, error: null };
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
