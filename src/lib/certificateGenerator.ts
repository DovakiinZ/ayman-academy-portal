/**
 * Certificate Generator
 * 
 * Handles: QR generation, PDF creation, Supabase upload.
 * 
 * SECURITY: Certificate issuance is handled SERVER-SIDE via Postgres RPC functions.
 * Students cannot insert certificates directly (RLS INSERT policy removed).
 * PDF generation is client-side but ONLY reads from snapshot_json, never live profile data.
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
// VERIFICATION CODE (kept for backward compat, but server generates its own)
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
// SECURE CERTIFICATE REQUEST (via RPC)
// ============================================

export interface RequestCertificateResult {
    certificate: Certificate | null;
    status: 'issued' | 'pending_approval' | 'already_exists' | 'not_eligible';
    error: string | null;
}

/**
 * Request a certificate via server-side RPC function.
 * The server validates eligibility, builds snapshot, and creates the certificate.
 * Students cannot bypass this — RLS INSERT is removed.
 */
export async function requestCertificateViaRPC(
    subjectId: string,
): Promise<RequestCertificateResult> {
    const { data, error } = await (supabase.rpc as any)('request_certificate', {
        p_subject_id: subjectId,
    });

    if (error) {
        console.error('RPC request_certificate error:', error);
        return { certificate: null, status: 'not_eligible', error: error.message };
    }

    const result = data as any;

    if (result.error) {
        return {
            certificate: null,
            status: result.status || 'not_eligible',
            error: result.error,
        };
    }

    // Fetch the full certificate record
    if (result.certificate_id) {
        const { data: cert } = await supabase
            .from('certificates')
            .select('*')
            .eq('id', result.certificate_id)
            .single() as any;

        return {
            certificate: cert as Certificate || null,
            status: result.status,
            error: null,
        };
    }

    return {
        certificate: null,
        status: result.status || 'not_eligible',
        error: result.error || null,
    };
}

// ============================================
// ADMIN RE-ISSUE (via RPC)
// ============================================

export async function reissueCertificateViaRPC(
    certificateId: string,
    reason?: string
): Promise<{ certificate: Certificate | null; error: string | null }> {
    const { data, error } = await (supabase.rpc as any)('admin_reissue_certificate', {
        p_certificate_id: certificateId,
        p_reason: reason || null,
    });

    if (error) {
        console.error('RPC admin_reissue_certificate error:', error);
        return { certificate: null, error: error.message };
    }

    const result = data as any;

    if (result.error) {
        return { certificate: null, error: result.error };
    }

    // Fetch the full new certificate
    if (result.certificate_id) {
        const { data: cert } = await supabase
            .from('certificates')
            .select('*')
            .eq('id', result.certificate_id)
            .single() as any;

        return { certificate: cert as Certificate || null, error: null };
    }

    return { certificate: null, error: 'Unknown error' };
}

// ============================================
// ADMIN APPROVE (via RPC)
// ============================================

export async function approveCertificateViaRPC(
    certificateId: string
): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await (supabase.rpc as any)('admin_approve_certificate', {
        p_certificate_id: certificateId,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    const result = data as any;
    if (result.error) {
        return { success: false, error: result.error };
    }

    return { success: true, error: null };
}

// ============================================
// ADMIN REVOKE (via RPC)
// ============================================

export async function revokeCertificateViaRPC(
    certificateId: string
): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await (supabase.rpc as any)('admin_revoke_certificate', {
        p_certificate_id: certificateId,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    const result = data as any;
    if (result.error) {
        return { success: false, error: result.error };
    }

    return { success: true, error: null };
}

// ============================================
// DUPLICATE CHECK (still useful for UI)
// ============================================

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
