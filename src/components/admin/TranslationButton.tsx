
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { translateText } from '@/lib/translation';
import { toast } from 'sonner';

interface TranslationButtonProps {
    sourceText: string;
    sourceLang: 'ar' | 'en';
    targetLang: 'ar' | 'en';
    onTranslated: (text: string) => void;
    label?: string;
}

export function TranslationButton({
    sourceText,
    sourceLang,
    targetLang,
    onTranslated,
    label
}: TranslationButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleTranslate = async () => {
        if (!sourceText) {
            toast.error(
                sourceLang === 'ar' ? 'الرجاء إدخال النص أولاً' : 'Please enter text first'
            );
            return;
        }

        setLoading(true);
        try {
            const result = await translateText(sourceText, sourceLang, targetLang);
            if (result) {
                onTranslated(result);
                toast.success(
                    targetLang === 'ar' ? 'تمت الترجمة بنجاح' : 'Translated successfully'
                );
            } else {
                toast.error('Could not translate text');
            }
        } catch (err) {
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
            disabled={loading || !sourceText}
            title="Auto Translate"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-primary"
        >
            {loading ? (
                <Loader2 className="w-3 h-3 animate-spin me-1" />
            ) : (
                <Sparkles className="w-3 h-3 me-1 text-yellow-500" />
            )}
            {label || 'Translate'}
        </Button>
    );
}
