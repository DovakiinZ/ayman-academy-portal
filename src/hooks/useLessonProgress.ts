import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface LessonProgress {
    id: string;
    lesson_id: string;
    user_id: string;
    progress_percent: number;
    last_position_seconds: number;
    completed_at: string | null;
    updated_at: string;
}

export function useLessonProgress(lessonId: string) {
    const { user } = useAuth();
    const [progress, setProgress] = useState<LessonProgress | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !lessonId) return;
        fetchProgress();
    }, [user, lessonId]);

    const fetchProgress = async () => {
        try {
            const { data, error } = await supabase
                .from('lesson_progress')
                .select('*')
                .eq('user_id', user!.id)
                .eq('lesson_id', lessonId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error fetching progress:', error);
            }

            setProgress(data);
        } catch (err) {
            console.error('Exception fetching progress:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateProgress = async (percent: number, positionSeconds: number) => {
        if (!user || !lessonId) return;

        const isCompleted = percent >= 90;
        const now = new Date().toISOString();

        const updates = {
            user_id: user.id,
            lesson_id: lessonId,
            progress_percent: Math.max(progress?.progress_percent || 0, percent),
            last_position_seconds: positionSeconds,
            updated_at: now,
            ...(isCompleted && !progress?.completed_at ? { completed_at: now } : {}),
        };

        try {
            const { data, error } = await supabase
                .from('lesson_progress')
                .upsert(updates, { onConflict: 'user_id,lesson_id' })
                .select()
                .single();

            if (error) throw error;
            setProgress(data);
        } catch (err) {
            console.error('Error updating progress:', err);
        }
    };

    return {
        progress,
        loading,
        updateProgress,
        isCompleted: !!progress?.completed_at,
    };
}
