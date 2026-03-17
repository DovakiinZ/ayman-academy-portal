/**
 * AI Service — Calls Supabase Edge Function (ai-assist) which uses Groq + openai/gpt-oss-20b.
 *
 * All AI processing happens server-side in the Edge Function.
 * No API keys are stored or sent from the frontend.
 */

import { supabase } from '@/lib/supabase';

export type AIAction =
    | 'expand'
    | 'simplify'
    | 'generate_example'
    | 'generate_summary'
    | 'generate_quiz'
    | 'improve_language'
    | 'translate_ar_en'
    | 'translate_en_ar';

export interface AIRequest {
    action: AIAction;
    content: string;
    context?: string;
    language?: 'ar' | 'en';
    options?: {
        summaryLength?: 'short' | 'medium' | 'detailed';
        subject?: string;
        gradeLevel?: string;
    };
}

export interface AIResponse {
    success: boolean;
    result: string;
    error?: string;
}

/**
 * Process an AI request via the Supabase Edge Function.
 */
export async function processAIRequest(request: AIRequest): Promise<AIResponse> {
    try {
        const { data, error } = await supabase.functions.invoke('ai-assist', {
            body: {
                action: request.action,
                content: request.content,
                language: request.language || 'ar',
                subject: request.options?.subject || 'general',
                gradeLevel: request.options?.gradeLevel || 'general',
                options: {
                    summaryLength: request.options?.summaryLength,
                },
            },
        });

        if (error) {
            return {
                success: false,
                result: '',
                error: error.message || 'Failed to call AI service',
            };
        }

        if (!data?.success) {
            return {
                success: false,
                result: '',
                error: data?.error || 'AI service returned an error',
            };
        }

        // For quiz: format structured JSON into readable text for the editor
        let resultText: string;
        if (request.action === 'generate_quiz' && Array.isArray(data.result)) {
            resultText = formatQuizResult(data.result, request.language || 'ar');
        } else {
            resultText = typeof data.result === 'string'
                ? data.result
                : JSON.stringify(data.result, null, 2);
        }

        return { success: true, result: resultText };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to connect to AI service';
        return { success: false, result: '', error: message };
    }
}

/**
 * Format structured quiz JSON into human-readable text for the lesson editor.
 */
function formatQuizResult(
    questions: Array<{
        question: string;
        options: string[];
        correctIndex: number;
        explanation?: string;
    }>,
    lang: 'ar' | 'en'
): string {
    const labels = ['A', 'B', 'C', 'D'];

    return questions
        .map((q, i) => {
            const qNum = lang === 'ar' ? `السؤال ${i + 1}` : `Question ${i + 1}`;
            const correctLabel = labels[q.correctIndex] || 'A';
            const answerLine = lang === 'ar'
                ? `الإجابة الصحيحة: ${correctLabel}`
                : `Correct answer: ${correctLabel}`;
            const explLine = q.explanation
                ? `\n${lang === 'ar' ? 'التوضيح' : 'Explanation'}: ${q.explanation}`
                : '';
            const optionsText = (q.options || [])
                .map((opt, j) => `  ${labels[j]}) ${opt}`)
                .join('\n');

            return `${qNum}: ${q.question}\n${optionsText}\n${answerLine}${explLine}`;
        })
        .join('\n\n');
}

/** Get display info for an AI action */
export function getActionInfo(action: AIAction, lang: 'ar' | 'en' = 'ar'): { label: string; description: string } {
    const info: Record<AIAction, { label_ar: string; label_en: string; desc_ar: string; desc_en: string }> = {
        expand: { label_ar: 'توسيع الشرح', label_en: 'Expand', desc_ar: 'إضافة تفاصيل وتوضيحات', desc_en: 'Add detail and explanation' },
        simplify: { label_ar: 'تبسيط', label_en: 'Simplify', desc_ar: 'تبسيط للطلاب الأصغر', desc_en: 'Simplify for younger students' },
        generate_example: { label_ar: 'إنشاء مثال', label_en: 'Generate Example', desc_ar: 'إنشاء مثال توضيحي', desc_en: 'Create an illustrative example' },
        generate_summary: { label_ar: 'إنشاء ملخص', label_en: 'Summarize', desc_ar: 'تلخيص المحتوى', desc_en: 'Summarize the content' },
        generate_quiz: { label_ar: 'إنشاء اختبار', label_en: 'Generate Quiz', desc_ar: 'إنشاء أسئلة اختبار', desc_en: 'Create quiz questions' },
        improve_language: { label_ar: 'تحسين اللغة', label_en: 'Improve Language', desc_ar: 'تحسين القواعد والوضوح', desc_en: 'Improve grammar and clarity' },
        translate_ar_en: { label_ar: 'ترجمة عربي←إنجليزي', label_en: 'Translate AR→EN', desc_ar: 'ترجمة إلى الإنجليزية', desc_en: 'Translate to English' },
        translate_en_ar: { label_ar: 'ترجمة إنجليزي←عربي', label_en: 'Translate EN→AR', desc_ar: 'ترجمة إلى العربية', desc_en: 'Translate to Arabic' },
    };

    const i = info[action];
    return {
        label: lang === 'ar' ? i.label_ar : i.label_en,
        description: lang === 'ar' ? i.desc_ar : i.desc_en,
    };
}
