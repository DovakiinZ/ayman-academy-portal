/**
 * AI Service — Placeholder for AI-powered content operations.
 * 
 * Wire this to OpenAI, Gemini, or a Supabase Edge Function.
 * Each function takes content and returns transformed text.
 * The caller is responsible for previewing and applying the result.
 */

export type AIAction =
    | 'expand'          // Expand explanation with more detail
    | 'simplify'        // Simplify for younger students
    | 'generate_example' // Generate an example from content
    | 'generate_summary' // Summarize section content
    | 'generate_quiz'   // Generate quiz questions from content
    | 'improve_language' // Polish grammar and clarity
    | 'translate_ar_en' // Translate Arabic → English
    | 'translate_en_ar'; // Translate English → Arabic

export interface AIRequest {
    action: AIAction;
    content: string;
    context?: string; // Additional context (e.g., subject, stage level)
    language?: 'ar' | 'en';
}

export interface AIResponse {
    success: boolean;
    result: string;
    error?: string;
}

const ACTION_PROMPTS: Record<AIAction, string> = {
    expand: 'Expand the following educational content with more detail, examples, and explanations. Keep the same language:',
    simplify: 'Simplify the following educational content for younger students (ages 10-14). Use simpler vocabulary and shorter sentences. Keep the same language:',
    generate_example: 'Generate a clear, practical example based on the following educational content. Keep the same language:',
    generate_summary: 'Write a concise summary of the following educational content in 2-3 sentences. Keep the same language:',
    generate_quiz: 'Generate 3 multiple-choice quiz questions based on the following content. Format each question with options labeled A, B, C, D and indicate the correct answer. Keep the same language:',
    improve_language: 'Improve the grammar, clarity, and flow of the following educational content. Maintain the original meaning and language:',
    translate_ar_en: 'Translate the following Arabic text to English, maintaining educational context and tone:',
    translate_en_ar: 'Translate the following English text to Arabic, maintaining educational context and tone:',
};

/**
 * Process an AI request. 
 * 
 * Currently returns a placeholder response.
 * To connect to a real AI service:
 * 1. Replace the body of this function with an API call
 * 2. Use supabase.functions.invoke() for Edge Functions
 * 3. Or call OpenAI/Gemini directly with an API key
 */
export async function processAIRequest(request: AIRequest): Promise<AIResponse> {
    const prompt = ACTION_PROMPTS[request.action];

    // ─── Option 1: Supabase Edge Function (recommended) ────────────
    // const { data, error } = await supabase.functions.invoke('ai-assistant', {
    //     body: { prompt: `${prompt}\n\n${request.content}`, context: request.context }
    // });
    // if (error) return { success: false, result: '', error: error.message };
    // return { success: true, result: data.text };

    // ─── Option 2: Direct OpenAI call ──────────────────────────────
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'Authorization': `Bearer ${OPENAI_API_KEY}`,
    //     },
    //     body: JSON.stringify({
    //         model: 'gpt-4o-mini',
    //         messages: [
    //             { role: 'system', content: 'You are an educational content assistant for an Arabic/English academy.' },
    //             { role: 'user', content: `${prompt}\n\n${request.content}` }
    //         ],
    //         temperature: 0.7,
    //     }),
    // });
    // const data = await response.json();
    // return { success: true, result: data.choices[0].message.content };

    // ─── Placeholder: Simulate AI response ─────────────────────────
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay

    const placeholders: Record<AIAction, (content: string) => string> = {
        expand: (c) => `${c}\n\n[AI: Expanded explanation would appear here with additional details, examples, and context to help students better understand the concept.]`,
        simplify: (c) => `[AI: Simplified version]\n${c.substring(0, Math.min(c.length, 100))}...\n[The content above would be rewritten in simpler language suitable for younger students.]`,
        generate_example: (c) => `[AI: Generated Example]\nBased on the content about "${c.substring(0, 50)}...":\n\nExample: [A practical, relatable example would be generated here to illustrate the concept.]`,
        generate_summary: (c) => `[AI: Summary]\n${c.substring(0, Math.min(c.length, 150))}... [This would be a concise 2-3 sentence summary of the full content.]`,
        generate_quiz: (c) => `[AI: Generated Quiz]\n\n1. Question based on the content?\n   A) Option 1\n   B) Option 2 ✓\n   C) Option 3\n   D) Option 4\n\n2. Another question?\n   A) Option 1\n   B) Option 2\n   C) Option 3 ✓\n   D) Option 4`,
        improve_language: (c) => c + '\n[AI: Grammar and clarity improvements would be applied here.]',
        translate_ar_en: (c) => `[AI: English Translation]\n${c}\n[The Arabic content would be translated to English here.]`,
        translate_en_ar: (c) => `[AI: Arabic Translation]\n${c}\n[The English content would be translated to Arabic here.]`,
    };

    const result = placeholders[request.action](request.content);
    return { success: true, result };
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
