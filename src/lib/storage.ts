import { supabase } from './supabase';

/**
 * Uploads an avatar image to the 'avatars' bucket.
 * Organizes files by userId to match RLS policies: avatars/userId/filename
 */
export async function uploadAvatar(userId: string, file: File): Promise<{ url: string | null; error: Error | null }> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return { url: data.publicUrl, error: null };
    } catch (error) {
        console.error('Error uploading avatar:', error);
        return { url: null, error: error as Error };
    }
}

/**
 * Helper to get the public URL for an avatar path if stored as a relative path
 */
export function getAvatarUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;

    const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

    return data.publicUrl;
}
