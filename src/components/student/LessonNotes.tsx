import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { LessonNote } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Trash2, StickyNote } from 'lucide-react';

interface LessonNotesProps {
    lessonId: string;
    currentTime: number; // Current playback time for timestamping
}

export default function LessonNotes({ lessonId, currentTime }: LessonNotesProps) {
    const { t } = useLanguage();
    const { profile } = useAuth();
    const [note, setNote] = useState('');
    const [savedNotes, setSavedNotes] = useState<LessonNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile?.id && lessonId) {
            fetchNotes();
        }
    }, [lessonId, profile?.id]);

    const fetchNotes = async () => {
        const { data } = await supabase
            .from('lesson_notes')
            .select('*')
            .eq('lesson_id', lessonId)
            .eq('user_id', profile!.id)
            .order('position_seconds', { ascending: true });

        if (data) setSavedNotes(data as LessonNote[]);
        setLoading(false);
    };

    const handleSaveNote = async () => {
        if (!note.trim() || !profile?.id) return;
        setSaving(true);

        const newNote = {
            user_id: profile.id,
            lesson_id: lessonId,
            content: note.trim(),
            position_seconds: Math.floor(currentTime),
            scroll_position: 0
        };

        const { data, error } = await supabase
            .from('lesson_notes')
            .insert(newNote)
            .select()
            .single();

        if (data && !error) {
            setSavedNotes(prev => [...prev, data as LessonNote].sort((a, b) => a.position_seconds - b.position_seconds));
            setNote('');
        }
        setSaving(false);
    };

    const handleDeleteNote = async (id: string) => {
        const { error } = await supabase
            .from('lesson_notes')
            .delete()
            .eq('id', id);

        if (!error) {
            setSavedNotes(prev => prev.filter(n => n.id !== id));
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="p-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>;

    return (
        <div className="bg-background rounded-lg border border-border flex flex-col h-[500px]">
            <div className="p-4 border-b border-border bg-secondary/10 flex items-center gap-2">
                <StickyNote className="w-4 h-4" />
                <h3 className="font-semibold">{t('ملاحظاتي', 'My Notes')}</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {savedNotes.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        {t('لا توجد ملاحظات. أضف ملاحظة عند أي نقطة في الدرس.', 'No notes yet. Add a note at any point in the lesson.')}
                    </div>
                ) : (
                    savedNotes.map(n => (
                        <div key={n.id} className="bg-secondary/20 p-3 rounded-lg border border-border group">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    {formatTime(n.position_seconds)}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteNote(n.id)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{n.content}</p>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-border bg-background">
                <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('اكتب ملاحظة خاصة...', 'Write a private note...')}
                    className="mb-2 min-h-[80px]"
                />
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                        {t('عند التوقيت:', 'At time:')} {formatTime(currentTime)}
                    </span>
                    <Button
                        size="sm"
                        onClick={handleSaveNote}
                        disabled={!note.trim() || saving}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                        {t('حفظ الملاحظة', 'Save Note')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
