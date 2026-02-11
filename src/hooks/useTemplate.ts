/**
 * useTemplate Hook
 * Helper to fetch and render a specific template with token interpolation
 */

import { useTemplates } from '@/contexts/TemplateContext';

/**
 * Get a rendered template by key.
 * Automatically selects the correct language and interpolates variables.
 */
export function useTemplate(
    key: string,
    defaultAr: string,
    defaultEn?: string,
    variables?: Record<string, string>
) {
    const { getTemplate, renderTemplate } = useTemplates();

    if (variables) {
        return renderTemplate(key, variables, defaultAr, defaultEn);
    }

    return getTemplate(key, defaultAr, defaultEn);
}
