import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { DndContext, DragEndEvent, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Lesson, LessonSection, LessonBlock } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Loader2, Plus, Save, ArrowLeft, ArrowRight, Eye, EyeOff, X, CheckCircle, Cloud, CloudOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Subcomponents
import LessonOutline from './LessonOutline';
import BlockEditor from './BlockEditor';
import LessonSettings from './LessonSettings';

// Save status type
type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export default function LessonEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t, direction } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [previewMode, setPreviewMode] = useState(false);

    // Data State
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [sections, setSections] = useState<LessonSection[]>([]);
    const [blocks, setBlocks] = useState<LessonBlock[]>([]);

    // UI State
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    // Auto-save timer
    const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
    const pendingUpdates = useRef<Map<string, Partial<LessonBlock>>>(new Map());

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (id) fetchLessonData();
    }, [id]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        };
    }, []);

    // ─── Navigation guards for unsaved changes ──────────────────────────

    // Browser close/refresh warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (saveStatus === 'unsaved' || saveStatus === 'saving') {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [saveStatus]);

    // In-app navigation blocker (react-router)
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            (saveStatus === 'unsaved' || saveStatus === 'saving') &&
            currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        if (blocker.state === 'blocked') {
            const leave = window.confirm(
                t(
                    'لديك تغييرات غير محفوظة. هل تريد مغادرة الصفحة؟',
                    'You have unsaved changes. Are you sure you want to leave?'
                )
            );
            if (leave) {
                blocker.proceed();
            } else {
                blocker.reset();
            }
        }
    }, [blocker.state, t]);

    const fetchLessonData = async () => {
        setLoading(true);
        try {
            const { data: lessonData, error: lessonError } = await supabase
                .from('lessons')
                .select('*')
                .eq('id', id!)
                .single();

            if (lessonError) throw lessonError;
            setLesson(lessonData);

            const { data: sectionsData, error: sectionsError } = await supabase
                .from('lesson_sections')
                .select('*')
                .eq('lesson_id', id!)
                .order('order_index');

            if (sectionsError) throw sectionsError;
            setSections((sectionsData as any) || []);

            const { data: blocksData, error: blocksError } = await supabase
                .from('lesson_blocks')
                .select('*')
                .eq('lesson_id', id!)
                .order('order_index');

            if (blocksError) throw blocksError;
            setBlocks((blocksData as any) || []);

            if (sectionsData && sectionsData.length > 0) {
                setActiveSectionId((sectionsData as any)[0].id);
            }
        } catch (error) {
            console.error('Error fetching lesson:', error);
            toast.error(t('خطأ في تحميل الدرس', 'Error loading lesson'));
        } finally {
            setLoading(false);
        }
    };

    // ─── Auto-save logic ────────────────────────────────────────────────

    const scheduleSave = useCallback(() => {
        setSaveStatus('unsaved');
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            flushPendingUpdates();
        }, 2000);
    }, []);

    const flushPendingUpdates = async () => {
        if (pendingUpdates.current.size === 0) return;

        setSaveStatus('saving');
        const updates = Array.from(pendingUpdates.current.entries());
        pendingUpdates.current.clear();

        try {
            for (const [blockId, data] of updates) {
                const { error } = await supabase.from('lesson_blocks').update(data as any).eq('id', blockId);
                if (error) throw error;
            }
            setSaveStatus('saved');
        } catch (error) {
            console.error('Auto-save error:', error);
            setSaveStatus('error');
            toast.error(t('فشل في الحفظ التلقائي', 'Auto-save failed'));
        }
    };

    // ─── Section handlers ───────────────────────────────────────────────

    const handleSectionReorder = async (newSections: LessonSection[]) => {
        setSections(newSections);
        const updates = newSections.map((s, index) => ({
            id: s.id,
            order_index: index,
            lesson_id: s.lesson_id,
            title_ar: s.title_ar,
        }));

        try {
            const { error } = await supabase.from('lesson_sections').upsert(updates as any);
            if (error) throw error;
        } catch (error) {
            toast.error(t('فشل في حفظ الترتيب', 'Failed to save order'));
            fetchLessonData();
        }
    };

    const handleCreateSection = async (title: string) => {
        if (!id) return;
        try {
            const { data, error } = await supabase.from('lesson_sections').insert({
                lesson_id: id,
                title_ar: title,
                order_index: sections.length
            } as any).select().single();

            if (error) throw error;
            setSections([...sections, data as any]);
            setActiveSectionId((data as any).id);
            toast.success(t('تم إنشاء القسم', 'Section created'));
        } catch (error) {
            toast.error(t('فشل في إنشاء القسم', 'Failed to create section'));
        }
    };

    const handleUpdateSection = async (sectionId: string, title: string) => {
        setSections(sections.map(s => s.id === sectionId ? { ...s, title_ar: title } : s));
        try {
            const { error } = await supabase.from('lesson_sections').update({ title_ar: title } as any).eq('id', sectionId);
            if (error) throw error;
        } catch (error) {
            toast.error(t('فشل في تحديث القسم', 'Failed to update section'));
        }
    };

    const handleDeleteSection = async (sectionId: string) => {
        if (!confirm(t('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف المحتوى بداخله.', 'Are you sure? Content inside will be deleted.'))) return;

        try {
            const { error } = await supabase.from('lesson_sections').delete().eq('id', sectionId);
            if (error) throw error;
            setSections(sections.filter(s => s.id !== sectionId));
            setBlocks(blocks.filter(b => b.section_id !== sectionId));
            if (activeSectionId === sectionId) setActiveSectionId(sections[0]?.id || null);
            toast.success(t('تم حذف القسم', 'Section deleted'));
        } catch (error) {
            toast.error(t('فشل في حذف القسم', 'Failed to delete section'));
        }
    };

    // ─── Block handlers ─────────────────────────────────────────────────

    const handleBlockReorder = async (newBlocks: LessonBlock[]) => {
        setBlocks(prevBlocks => {
            // Replace blocks for the active section, keep others
            const otherBlocks = prevBlocks.filter(b => {
                if (activeSectionId) return b.section_id !== activeSectionId;
                return b.section_id !== null;
            });
            return [...otherBlocks, ...newBlocks.map((b, i) => ({ ...b, order_index: i }))];
        });

        const updates = newBlocks.map((b, index) => ({
            id: b.id,
            order_index: index,
            lesson_id: b.lesson_id,
            type: b.type
        }));

        try {
            const { error } = await supabase.from('lesson_blocks').upsert(updates as any);
            if (error) throw error;
        } catch (error) {
            toast.error(t('فشل في حفظ الترتيب', 'Failed to save order'));
            fetchLessonData();
        }
    };

    const handleCreateBlock = async (type: any) => {
        if (!id) return;
        try {
            const relevantBlocks = blocks.filter(b => b.section_id === activeSectionId || (!activeSectionId && !b.section_id));
            const maxOrder = relevantBlocks.length > 0 ? Math.max(...relevantBlocks.map(b => b.order_index)) : -1;

            const { data, error } = await supabase.from('lesson_blocks').insert({
                lesson_id: id,
                section_id: activeSectionId || null,
                type: type,
                order_index: maxOrder + 1,
                content_ar: '',
            } as any).select().single();

            if (error) throw error;
            setBlocks([...blocks, data as any]);
            toast.success(t('تم إضافة محتوى', 'Content added'));
        } catch (error) {
            toast.error(t('فشل في إضافة المحتوى', 'Failed to add content'));
        }
    };

    const handleUpdateBlock = async (blockId: string, data: Partial<LessonBlock>) => {
        // Optimistic update
        setBlocks(blocks.map(b => b.id === blockId ? { ...b, ...data } : b));

        // Queue for auto-save
        const existing = pendingUpdates.current.get(blockId) || {};
        pendingUpdates.current.set(blockId, { ...existing, ...data });
        scheduleSave();
    };

    const handleDeleteBlock = async (blockId: string) => {
        if (!confirm(t('هل أنت متأكد؟', 'Are you sure?'))) return;

        try {
            const { error } = await supabase.from('lesson_blocks').delete().eq('id', blockId);
            if (error) throw error;
            setBlocks(blocks.filter(b => b.id !== blockId));
            toast.success(t('تم الحذف', 'Deleted'));
        } catch (error) {
            toast.error(t('فشل في الحذف', 'Failed to delete'));
        }
    };

    // ─── Save status indicator ──────────────────────────────────────────

    const SaveStatusIndicator = () => {
        const statusConfig = {
            saved: { icon: Cloud, text: t('محفوظ', 'Saved'), color: 'text-green-500' },
            saving: { icon: Loader2, text: t('جاري الحفظ...', 'Saving...'), color: 'text-blue-500' },
            unsaved: { icon: CloudOff, text: t('تغييرات غير محفوظة', 'Unsaved'), color: 'text-yellow-500' },
            error: { icon: AlertCircle, text: t('فشل الحفظ', 'Save failed'), color: 'text-red-500' },
        };

        const cfg = statusConfig[saveStatus];
        const Icon = cfg.icon;

        return (
            <div className={cn("flex items-center gap-1.5 text-xs", cfg.color)}>
                <Icon className={cn("w-3.5 h-3.5", saveStatus === 'saving' && "animate-spin")} />
                <span>{cfg.text}</span>
            </div>
        );
    };

    // ─── Filtered blocks for current section ────────────────────────────

    const filteredBlocks = blocks.filter(b =>
        b.section_id === activeSectionId || (!activeSectionId && !b.section_id)
    );

    // ─── Loading / Not Found ────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!lesson) {
        return <div className="p-8 text-center">{t('الدرس غير موجود', 'Lesson not found')}</div>;
    }

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Left Sidebar: Outline */}
            <div className="w-64 border-e border-border bg-card flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h2 className="font-semibold text-sm">{t('محتوى الدرس', 'Lesson Content')}</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    <LessonOutline
                        sections={sections}
                        blocks={blocks}
                        activeSectionId={activeSectionId}
                        onSelectSection={setActiveSectionId}
                        onReorder={handleSectionReorder}
                        onCreateSection={handleCreateSection}
                        onUpdateSection={handleUpdateSection}
                        onDeleteSection={handleDeleteSection}
                    />
                </div>
            </div>

            {/* Main Content: Block Editor */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
                {/* Toolbar */}
                <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                            {direction === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                        </Button>
                        <h1 className="font-medium text-sm truncate max-w-[300px]">{lesson.title_ar}</h1>
                        <SaveStatusIndicator />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant={previewMode ? "default" : "outline"}
                            onClick={() => setPreviewMode(!previewMode)}
                            className="gap-1.5"
                        >
                            {previewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {previewMode ? t('تحرير', 'Edit') : t('معاينة', 'Preview')}
                        </Button>
                    </div>
                </div>

                {/* Editor Canvas */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-3xl mx-auto min-h-[500px]">
                        {previewMode ? (
                            <PreviewRenderer blocks={filteredBlocks} sections={sections} activeSectionId={activeSectionId} />
                        ) : (
                            <>
                                <BlockEditor
                                    blocks={filteredBlocks}
                                    onReorder={handleBlockReorder}
                                    onCreateBlock={handleCreateBlock}
                                    onUpdateBlock={handleUpdateBlock}
                                    onDeleteBlock={handleDeleteBlock}
                                />

                                {filteredBlocks.length === 0 && (
                                    <div className="border border-dashed border-border rounded-lg p-12 text-center">
                                        <p className="text-muted-foreground text-sm mb-4">
                                            {t('لا يوجد محتوى في هذا القسم', 'No content in this section')}
                                        </p>
                                        <Button variant="secondary" onClick={() => handleCreateBlock('rich_text')}>
                                            <Plus className="w-4 h-4 me-2" />
                                            {t('إضافة نص', 'Add Text')}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Sidebar: Settings */}
            <div className="w-80 border-s border-border bg-card flex flex-col">
                <div className="p-4 border-b border-border">
                    <h2 className="font-semibold text-sm">{t('إعدادات الدرس', 'Lesson Settings')}</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <LessonSettings
                        lesson={lesson}
                        onUpdate={async (updates) => {
                            const { error } = await supabase.from('lessons').update(updates as any).eq('id', lesson.id);
                            if (error) {
                                console.error(error);
                                toast.error(t('فشل التحديث', 'Update failed'));
                            } else {
                                setLesson({ ...lesson, ...updates });
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Preview Renderer ───────────────────────────────────────────────────────

function PreviewRenderer({
    blocks,
    sections,
    activeSectionId
}: {
    blocks: LessonBlock[];
    sections: LessonSection[];
    activeSectionId: string | null;
}) {
    const { t } = useLanguage();
    const activeSection = sections.find(s => s.id === activeSectionId);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-6">
                <Badge variant="secondary" className="gap-1">
                    <Eye className="w-3 h-3" />
                    {t('وضع المعاينة', 'Preview Mode')}
                </Badge>
            </div>

            {activeSection && (
                <h2 className="text-xl font-bold border-b border-border pb-2">
                    {t(activeSection.title_ar, activeSection.title_en || activeSection.title_ar)}
                </h2>
            )}

            {blocks.filter(b => b.is_published !== false).map(block => (
                <PreviewBlock key={block.id} block={block} />
            ))}

            {blocks.filter(b => b.is_published !== false).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    {t('لا يوجد محتوى منشور للمعاينة', 'No published content to preview')}
                </div>
            )}
        </div>
    );
}

function PreviewBlock({ block }: { block: LessonBlock }) {
    const { t } = useLanguage();

    const getYoutubeId = (url: string) => {
        const match = url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)/);
        return (match && match[1].length === 11) ? match[1] : null;
    };

    switch (block.type) {
        case 'rich_text':
            return (
                <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'tip':
            return (
                <div className="bg-blue-50 dark:bg-blue-950/30 border-s-4 border-blue-500 p-4 rounded-e-md">
                    <p className="text-blue-600 font-semibold text-sm mb-1">{t('نصيحة', 'Tip')}</p>
                    <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'warning':
            return (
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border-s-4 border-yellow-500 p-4 rounded-e-md">
                    <p className="text-yellow-600 font-semibold text-sm mb-1">{t('تنبيه', 'Warning')}</p>
                    <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'example':
            return (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border-s-4 border-emerald-500 p-4 rounded-e-md">
                    <p className="text-emerald-600 font-semibold text-sm mb-1">{t('مثال', 'Example')}</p>
                    <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'exercise':
            return (
                <div className="bg-orange-50 dark:bg-orange-950/30 border-s-4 border-orange-500 p-4 rounded-e-md">
                    <p className="text-orange-600 font-semibold text-sm mb-1">{t('تمرين', 'Exercise')}</p>
                    <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'equation':
            return (
                <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                    {(block.title_ar || block.title_en) && (
                        <p className="text-xs text-muted-foreground mb-2">{t(block.title_ar || '', block.title_en || '')}</p>
                    )}
                    <div className="text-center text-lg font-mono py-2">
                        {t(block.content_ar || '', block.content_en || block.content_ar || '')}
                    </div>
                </div>
            );
        case 'qa':
            return (
                <div className="bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2">
                        <span className="text-pink-500 font-bold text-sm">Q:</span>
                        <p className="text-sm font-medium">{t(block.title_ar || '', block.title_en || '')}</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold text-sm">A:</span>
                        <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                    </div>
                </div>
            );
        case 'video': {
            const ytId = block.url ? getYoutubeId(block.url) : null;
            if (ytId) {
                return (
                    <div className="space-y-2">
                        {(block.title_ar || block.title_en) && (
                            <h3 className="text-sm font-semibold">{t(block.title_ar || '', block.title_en || '')}</h3>
                        )}
                        <div className="aspect-video bg-black rounded-lg overflow-hidden">
                            <iframe width="100%" height="100%"
                                src={`https://www.youtube.com/embed/${ytId}`}
                                title="Preview" frameBorder="0" allowFullScreen
                                className="w-full h-full"
                            />
                        </div>
                    </div>
                );
            }
            return (
                <div className="p-4 bg-secondary/20 rounded-lg">
                    <p className="text-blue-500 underline text-sm">{block.url}</p>
                </div>
            );
        }
        case 'image':
            return block.url ? (
                <div className="rounded-lg overflow-hidden">
                    <img src={block.url} alt="" className="max-w-full h-auto mx-auto rounded-lg shadow-sm" />
                </div>
            ) : null;
        case 'file':
            return (
                <div className="flex items-center gap-3 p-4 bg-secondary/20 rounded-lg border border-border">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-blue-500 text-xs font-bold">📎</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium">{t(block.title_ar || 'ملف مرفق', block.title_en || 'Attached File')}</p>
                        <p className="text-xs text-muted-foreground">{t('اضغط للتحميل', 'Click to download')}</p>
                    </div>
                </div>
            );
        case 'link':
            return (
                <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <span className="text-purple-500">🔗</span>
                    <div>
                        <p className="text-sm font-medium">{t(block.title_ar || '', block.title_en || block.url || '')}</p>
                        {(block.content_ar || block.content_en) && (
                            <p className="text-xs text-muted-foreground">{t(block.content_ar || '', block.content_en || '')}</p>
                        )}
                    </div>
                </div>
            );
        default:
            return null;
    }
}
