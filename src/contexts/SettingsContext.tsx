import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export type SystemSettingKey =
    | 'ui.default_language'
    | 'ui.enable_ratings'
    | 'ui.enable_comments'
    | 'home.show_featured_teachers'
    | 'home.show_featured_subjects'
    | 'home.show_featured_lessons'
    | 'completion.certificate_threshold_percent'
    | 'completion.lesson_complete_percent'
    | 'paywall.allow_free_preview'
    | 'paywall.free_preview_per_teacher_count'
    | string; // Allow unchecked strings for flexibility

export interface SystemSetting {
    key: string;
    value: any;
    description: string | null;
}

interface SettingsContextType {
    settings: Record<string, any>;
    get: (key: SystemSettingKey, fallback?: any) => any;
    refresh: () => Promise<void>;
    isLoading: boolean;
    updateSetting: (key: string, value: any, description?: string) => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// ============================================
// DEFAULTS (Safe Fallbacks)
// ============================================

const DEFAULT_SETTINGS: Record<string, any> = {
    'ui.default_language': 'ar',
    'ui.enable_ratings': true,
    'ui.enable_comments': true,
    'home.show_featured_teachers': true,
    'home.show_featured_subjects': true,
    'home.show_featured_lessons': true,
    'completion.certificate_threshold_percent': 90,
    'completion.lesson_complete_percent': 90,
    'paywall.allow_free_preview': true,
    'paywall.free_preview_per_teacher_count': 3
};

// ============================================
// PROVIDER
// ============================================

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);

    // Initial fetch
    useEffect(() => {
        refresh();
    }, []);

    const refresh = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('key, value');

            if (error) {
                console.error('Failed to load settings:', error);
                // Don't block app, keep defaults or empty state, but maybe warn if user is admin?
                // For now, silent fail with console error is safer than crashing UI.
            }

            const newSettings: Record<string, any> = {};

            // Populate with DB data
            (data as SystemSetting[] | null)?.forEach((row) => {
                newSettings[row.key] = row.value;
            });

            setSettings(newSettings);
        } catch (err) {
            console.error('Settings fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Get helper with fallback
    const get = useCallback((key: SystemSettingKey, fallback?: any) => {
        // 1. Try DB value
        if (settings[key] !== undefined) {
            return settings[key];
        }
        // 2. Try explicit fallback
        if (fallback !== undefined) {
            return fallback;
        }
        // 3. Try hardcoded default
        return DEFAULT_SETTINGS[key];
    }, [settings]);

    // Admin helper to update setting
    const updateSetting = async (key: string, value: any, description?: string) => {
        try {
            const payload: any = {
                key,
                value,
                updated_at: new Date().toISOString()
            };

            if (description !== undefined) {
                payload.description = description;
            }

            const { error } = await supabase
                .from('system_settings')
                .upsert(payload);

            if (error) throw error;

            // Optimistic update or refetch? Refetch is safer for consistency.
            await refresh();
            return true;
        } catch (err) {
            console.error('Settings update error:', err);
            toast.error('فشل حفظ الإعدادات');
            return false;
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, get, refresh, isLoading, updateSetting }}>
            {children}
        </SettingsContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
