/**
 * Translation Utility
 * Uses the ai-assist Supabase Edge Function (Groq + openai/gpt-oss-20b) for translation.
 * No API keys are stored or sent from the frontend.
 */

import { supabase } from '@/lib/supabase';

export async function translateText(text: string, from: 'ar' | 'en', to: 'ar' | 'en'): Promise<string | null> {
    if (!text?.trim()) return null;
    if (from === to) return text;

    try {
        const { data, error } = await supabase.functions.invoke('ai-assist', {
            body: {
                action: 'translate',
                content: text.trim(),
                language: from,
                targetLanguage: to,
            },
        });

        if (error || !data?.success) {
            console.error('Translation error:', error?.message || data?.error);
            return null;
        }

        return typeof data.result === 'string' ? data.result : null;
    } catch (error) {
        console.error('Translation error:', error);
        return null;
    }
}
