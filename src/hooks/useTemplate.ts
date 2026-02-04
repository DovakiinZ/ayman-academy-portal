/**
 * useTemplate Hook
 * Helper to easily fetch a specific template with fallback
 */

import { useTemplates } from '@/contexts/TemplateContext';

export function useTemplate(
    key: string,
    defaultAr: string,
    defaultEn?: string,
    variables?: Record<string, string | number>
) {
    const { getTemplate } = useTemplates();

    // Get raw text
    const text = getTemplate(key, defaultAr, defaultEn);

    // Interpolate variables if provided
    if (!variables) return text;

    return Object.entries(variables).reduce((acc, [key, value]) => {
        return acc.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }, text);
}
