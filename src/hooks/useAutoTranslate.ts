import { useEffect, useRef, useState } from 'react';
import { translateText } from '@/lib/translation';

/**
 * Auto-translates text after the user stops typing (debounce).
 * Only fires when the source text changes AND is non-empty.
 * Prevents feedback loops by tracking the last translated source.
 */
export function useAutoTranslate(
    sourceText: string,
    sourceLang: 'ar' | 'en',
    targetLang: 'ar' | 'en',
    onTranslated: (text: string) => void,
    enabled = true,
    debounceMs = 800
) {
    const [isTranslating, setIsTranslating] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();
    const lastSourceRef = useRef<string>('');

    useEffect(() => {
        if (!enabled) return;
        const trimmed = sourceText.trim();
        if (!trimmed || trimmed === lastSourceRef.current) return;

        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            setIsTranslating(true);
            try {
                const result = await translateText(trimmed, sourceLang, targetLang);
                if (result) {
                    lastSourceRef.current = trimmed;
                    onTranslated(result);
                }
            } finally {
                setIsTranslating(false);
            }
        }, debounceMs);

        return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sourceText, enabled]);

    return { isTranslating };
}
