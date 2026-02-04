/**
 * TemplateContext - Manages dynamic text templates
 * Caches templates to minimize database requests
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { ContentTemplate } from '@/types/database';

interface TemplateContextType {
    getTemplate: (key: string, defaultAr: string, defaultEn?: string) => string;
    refreshTemplates: () => Promise<void>;
    isLoading: boolean;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export function TemplateProvider({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();
    const [templates, setTemplates] = useState<Record<string, ContentTemplate>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set());

    // Initial load of all public templates
    useEffect(() => {
        refreshTemplates();
    }, []);

    const refreshTemplates = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('content_templates')
                .select('*')
                .eq('is_public', true);

            if (error) throw error;

            const templateMap: Record<string, ContentTemplate> = {};
            (data as ContentTemplate[] | null)?.forEach(t => {
                templateMap[t.key] = t;
            });

            setTemplates(templateMap);
        } catch (err) {
            console.error('Error fetching templates:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to replace variables like {{name}}
    const interpolate = (text: string, variables?: Record<string, string | number>) => {
        if (!variables) return text;
        return Object.entries(variables).reduce((acc, [key, value]) => {
            return acc.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        }, text);
    };

    const getTemplate = useCallback((key: string, defaultAr: string, defaultEn?: string) => {
        const template = templates[key];

        // If template exists, use it based on current language
        if (template) {
            if (language === 'ar' && template.content_ar) return template.content_ar;
            if (language === 'en' && template.content_en) return template.content_en;
            // Fallback to other language if current is missing
            return template.content_ar || template.content_en || defaultAr;
        }

        // Fallback to defaults provided in code
        return language === 'ar' ? defaultAr : (defaultEn || defaultAr);
    }, [templates, language]);

    return (
        <TemplateContext.Provider value={{ getTemplate, refreshTemplates, isLoading }}>
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
