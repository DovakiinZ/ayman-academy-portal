import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

// ─── Update Lesson Progress ──────────────────────────────

export function useUpdateProgress(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lessonId,
      percent,
      positionSeconds,
      completedAt,
    }: {
      lessonId: string;
      percent: number;
      positionSeconds: number;
      completedAt?: string | null;
    }) => {
      const now = new Date().toISOString();
      const updates: any = {
        user_id: userId!,
        lesson_id: lessonId,
        progress_percent: percent,
        last_position_seconds: positionSeconds,
        updated_at: now,
      };
      if (completedAt !== undefined) {
        updates.completed_at = completedAt;
      }

      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert(updates, { onConflict: 'user_id,lesson_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.student.progress(userId) });
      }
    },
  });
}

// ─── Send Message ────────────────────────────────────────

export function useSendMessage(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      receiverId,
      content,
    }: {
      receiverId: string;
      content: string;
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: userId!,
          receiver_id: receiverId,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });
}

// ─── Update Profile ──────────────────────────────────────

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
}
