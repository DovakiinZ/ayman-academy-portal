import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { LessonComment, Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, User, MessageCircle } from 'lucide-react';

interface LessonCommentsProps {
    lessonId: string;
}

interface CommentWithUser extends LessonComment {
    user: Profile;
}

export default function LessonComments({ lessonId }: LessonCommentsProps) {
    const { t } = useLanguage();
    const { profile } = useAuth();
    const [comments, setComments] = useState<CommentWithUser[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (lessonId) {
            fetchComments();
        }
    }, [lessonId]);

    const fetchComments = async () => {
        const { data } = await supabase
            .from('lesson_comments')
            .select('*, user:profiles(*)')
            .eq('lesson_id', lessonId)
            .order('created_at', { ascending: false });

        if (data) setComments(data as CommentWithUser[]);
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!newComment.trim() || !profile?.id) return;
        setSubmitting(true);

        const { data, error } = await supabase
            .from('lesson_comments')
            .insert({
                user_id: profile.id,
                lesson_id: lessonId,
                content: newComment.trim()
            })
            .select('*, user:profiles(*)')
            .single();

        if (data && !error) {
            setComments(prev => [data as CommentWithUser, ...prev]);
            setNewComment('');
        }
        setSubmitting(false);
    };

    if (loading) return null;

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                {t('التعليقات والأسئلة', 'Comments & Questions')}
            </h3>

            {/* Input */}
            <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-2">
                    <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={t('أضف تعليقاً أو سؤالاً...', 'Add a comment or question...')}
                        className="min-h-[80px]"
                    />
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={!newComment.trim() || submitting}
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 me-2" />}
                            {t('نشر', 'Post')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-6">
                {comments.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                        {t('كن أول من يعلق على هذا الدرس', 'Be the first to comment on this lesson')}
                    </p>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                                {comment.user?.avatar_url ? (
                                    <img src={comment.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-5 h-5 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm">{comment.user?.full_name || t('مستخدم', 'User')}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(comment.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                    {comment.content}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
