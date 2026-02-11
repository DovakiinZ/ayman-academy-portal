/**
 * TemplateContext - Manages dynamic text templates
 * Updated to use the new `templates` table with token rendering support
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Template } from '@/types/database';
import { renderTemplate as render } from '@/lib/templateRenderer';

interface TemplateContextType {
    /** Get raw template text by key (language-aware) */
    getTemplate: (key: string, defaultAr: string, defaultEn?: string) => string;
    /** Render a template with token values */
    renderTemplate: (key: string, values: Record<string, string>, defaultAr: string, defaultEn?: string) => string;
    /** Get full template object by key */
    getTemplateObject: (key: string) => Template | undefined;
    /** Force reload templates from DB */
    refreshTemplates: () => Promise<void>;
    /** All loaded templates */
    templates: Template[];
    isLoading: boolean;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export function TemplateProvider({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [templateMap, setTemplateMap] = useState<Record<string, Template>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        refreshTemplates();
    }, []);

    const refreshTemplates = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .eq('is_active', true)
                .order('type')
                .order('key');

            if (error) throw error;

            const list = (data as Template[]) || [];
            setTemplates(list);

            const map: Record<string, Template> = {};
            list.forEach(t => { map[t.key] = t; });
            setTemplateMap(map);
        } catch (err) {
            console.error('[TemplateContext] Error fetching templates:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getTemplate = useCallback((key: string, defaultAr: string, defaultEn?: string) => {
        const template = templateMap[key];
        if (template) {
            if (language === 'ar' && template.content_ar) return template.content_ar;
            if (language === 'en' && template.content_en) return template.content_en;
            return template.content_ar || template.content_en || defaultAr;
        }
        return language === 'ar' ? defaultAr : (defaultEn || defaultAr);
    }, [templateMap, language]);

    const renderTemplateText = useCallback((
        key: string,
        values: Record<string, string>,
        defaultAr: string,
        defaultEn?: string
    ) => {
        const raw = getTemplate(key, defaultAr, defaultEn);
        const template = templateMap[key];
        const allowedTokens = template?.variables?.map(v => v.token);
        return render(raw, values, { allowedTokens, escapeValues: false });
    }, [getTemplate, templateMap]);

    const getTemplateObject = useCallback((key: string) => {
        return templateMap[key];
    }, [templateMap]);

    return (
        <TemplateContext.Provider value={{
            getTemplate,
            renderTemplate: renderTemplateText,
            getTemplateObject,
            refreshTemplates,
            templates,
            isLoading,
        }}>
            {children}
        </TemplateContext.Provider>
    );
}

export function useTemplates() {
    const context = useContext(TemplateContext);
    if (context === undefined) {
        throw new Error('useTemplates must be used within a TemplateProvider');
    }
    return context;
}
