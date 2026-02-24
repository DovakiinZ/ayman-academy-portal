/**
 * AI Service — Uses Google Gemini API (free tier) for content operations.
 *
 * Free tier: 15 requests/min, 1M tokens/min
 * Get your API key at: https://aistudio.google.com/apikey
 *
 * Set VITE_GEMINI_API_KEY in your .env file.
 */

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
}

export interface AIResponse {
    success: boolean;
    result: string;
    error?: string;
}

const SYSTEM_INSTRUCTION = `You are an expert educational content assistant for a bilingual Arabic/English academy called "Ayman Academy".
You help teachers create and improve lesson content for students of all ages.
- When the input is in Arabic, respond in Arabic.
- When the input is in English, respond in English.
- Unless explicitly asked to translate.
- Keep your responses focused, educational, and clear.
- Do not include any markdown formatting like ## or ** unless the content already uses it.`;

const ACTION_PROMPTS: Record<AIAction, string> = {
    expand: 'Expand the following educational content with more detail, examples, and explanations. Keep the same language as the input:',
    simplify: 'Simplify the following educational content for younger students (ages 10-14). Use simpler vocabulary and shorter sentences. Keep the same language as the input:',
    generate_example: 'Generate a clear, practical example based on the following educational content. Keep the same language as the input:',
    generate_summary: 'Write a concise summary of the following educational content in 2-3 sentences. Keep the same language as the input:',
    generate_quiz: 'Generate 3 multiple-choice quiz questions based on the following content. Format each question with options labeled A, B, C, D and indicate the correct answer. Keep the same language as the input:',
    improve_language: 'Improve the grammar, clarity, and flow of the following educational content. Maintain the original meaning and language. Return ONLY the improved text:',
    translate_ar_en: 'Translate the following Arabic text to English, maintaining educational context and tone. Return ONLY the translation:',
    translate_en_ar: 'Translate the following English text to Arabic, maintaining educational context and tone. Return ONLY the translation:',
};

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const HF_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3';

/**
 * Process an AI request with transparent fallback.
 */
export async function processAIRequest(request: AIRequest): Promise<AIResponse> {
    // 1. Try Gemini first if key exists
    if (GEMINI_API_KEY) {
        const geminiResult = await processGeminiRequest(request);
        if (geminiResult.success) return geminiResult;

        // If it's a quota or auth error, fall through to HF
        const isQuotaError = geminiResult.error?.toLowerCase().includes('quota') ||
            geminiResult.error?.toLowerCase().includes('rate') ||
            geminiResult.error?.toLowerCase().includes('429');

        if (!isQuotaError) {
            console.warn('Gemini failed with non-quota error, attempting fallback anyway:', geminiResult.error);
        }
    }

    // 2. Fallback to Hugging Face
    console.log('Using Hugging Face fallback...');
    return processHFRequest(request);
}

/**
 * Internal: Process via Gemini
 */
async function processGeminiRequest(request: AIRequest): Promise<AIResponse> {
    const prompt = ACTION_PROMPTS[request.action];

    try {
        const userMessage = request.context
            ? `${prompt}\n\nContext: ${request.context}\n\nContent:\n${request.content}`
            : `${prompt}\n\n${request.content}`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: SYSTEM_INSTRUCTION }],
                },
                contents: [{
                    parts: [{ text: userMessage }],
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData?.error?.message || `API error: ${response.status}`;
            return { success: false, result: '', error: errorMessage };
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return { success: false, result: '', error: 'No response from Gemini' };
        }

        return { success: true, result: text.trim() };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown Gemini error';
        return { success: false, result: '', error: message };
    }
}

/**
 * Internal: Process via Hugging Face
 */
async function processHFRequest(request: AIRequest): Promise<AIResponse> {
    const prompt = ACTION_PROMPTS[request.action];

    try {
        const userMessage = `[INST] ${SYSTEM_INSTRUCTION}\n\n${prompt}\n\n${request.context ? `Context: ${request.context}\n\n` : ''}Content: ${request.content} [/INST]`;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (HF_API_TOKEN) {
            headers['Authorization'] = `Bearer ${HF_API_TOKEN}`;
        }

        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                inputs: userMessage,
                parameters: {
                    max_new_tokens: 1024,
                    temperature: 0.7,
                    return_full_text: false
                }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData?.error || errorData?.message || `HF API error: ${response.status}`;
            return { success: false, result: '', error: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage) };
        }

        const data = await response.json();
        let text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;

        if (!text) {
            return { success: false, result: '', error: 'No response from Hugging Face' };
        }

        return { success: true, result: text.trim() };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown HF error';
        return { success: false, result: '', error: message };
    }
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
