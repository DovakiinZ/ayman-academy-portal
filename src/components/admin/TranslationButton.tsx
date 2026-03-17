import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
import { translateText } from '@/lib/translation';
import { toast } from 'sonner';

interface TranslationButtonProps {
    sourceText: string;
    sourceLang: 'ar' | 'en';
    targetLang: 'ar' | 'en';
    onTranslated: (text: string) => void;
    label?: string;
    /** Pass true when an auto-translate is in progress (from useAutoTranslate hook) */
    autoTranslating?: boolean;
}

export function TranslationButton({
    sourceText,
    sourceLang,
    targetLang,
    onTranslated,
    label,
    autoTranslating = false,
}: TranslationButtonProps) {
    const [loading, setLoading] = useState(false);
    const busy = loading || autoTranslating;

    const handleTranslate = async () => {
        if (!sourceText) {
            toast.error(sourceLang === 'ar' ? 'الرجاء إدخال النص أولاً' : 'Please enter text first');
            return;
        }
        setLoading(true);
        try {
            const result = await translateText(sourceText, sourceLang, targetLang);
            if (result) {
                onTranslated(result);
            } else {
                toast.error('Could not translate text');
            }
        } catch {
            toast.error('Translation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleTranslate}
            disabled={busy || !sourceText}
            title={sourceLang === 'ar' ? 'ترجمة إلى الإنجليزية' : 'Translate to Arabic'}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
        >
            {busy ? (
                <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
                <Languages className="w-3 h-3" />
            )}
            {label ?? (sourceLang === 'ar' ? 'ترجم' : 'Translate')}
        </Button>
    );
}
