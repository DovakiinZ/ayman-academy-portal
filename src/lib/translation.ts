
/**
 * Translation Utility
 * Uses free API for basic translation.
 * API: MyMemory (mymemory.translated.net)
 */

export async function translateText(text: string, from: 'ar' | 'en', to: 'ar' | 'en'): Promise<string | null> {
    if (!text || !text.trim()) return null;

    try {
        const langPair = `${from}|${to}`;
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`);
        const data = await response.json();

        if (data && data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }

        return null;
    } catch (error) {
        console.error("Translation error:", error);
        return null;
    }
}
