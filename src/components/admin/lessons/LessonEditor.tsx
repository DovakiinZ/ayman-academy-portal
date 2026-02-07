import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Lesson, LessonSection, LessonBlock } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Loader2, Plus, Save, ArrowLeft, ArrowRight, Layout, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Subcomponents
import LessonOutline from './LessonOutline';
import BlockEditor from './BlockEditor';
import LessonSettings from './LessonSettings';

export default function LessonEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t, direction } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data State
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [sections, setSections] = useState<LessonSection[]>([]);
    const [blocks, setBlocks] = useState<LessonBlock[]>([]);

    // UI State
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

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

    const fetchLessonData = async () => {
        setLoading(true);
        try {
            // Fetch Lesson
            const { data: lessonData, error: lessonError } = await supabase
                .from('lessons')
                .select('*')
                .eq('id', id!)
                .single();

            if (lessonError) throw lessonError;
            setLesson(lessonData);

            // Fetch Sections
            const { data: sectionsData, error: sectionsError } = await supabase
                .from('lesson_sections')
                .select('*')
                .eq('lesson_id', id!)
                .order('order_index');

            if (sectionsError) throw sectionsError;
            setSections((sectionsData as any) || []);

            // Fetch Blocks (flat list for now, filtering by section in UI)
            const { data: blocksData, error: blocksError } = await supabase
                .from('lesson_blocks')
                .select('*')
                .eq('lesson_id', id!)
                .order('order_index');

            if (blocksError) throw blocksError;
            setBlocks((blocksData as any) || []);

            // Set initial active section
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

    const handleSectionReorder = async (newSections: LessonSection[]) => {
        setSections(newSections);
        // Persist order
        const updates = newSections.map((s, index) => ({
            id: s.id,
            order_index: index,
            lesson_id: s.lesson_id, // valid
            title_ar: s.title_ar, // valid
        }));

        try {
            const { error } = await supabase.from('lesson_sections').upsert(updates as any);
            if (error) throw error;
        } catch (error) {
            toast.error(t('فشل في حفظ الترتيب', 'Failed to save order'));
            fetchLessonData(); // Revert
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
            if (activeSectionId === sectionId) setActiveSectionId(null);
            toast.success(t('تم حذف القسم', 'Section deleted'));
        } catch (error) {
            toast.error(t('فشل في حذف القسم', 'Failed to delete section'));
        }
    };

    const handleBlockReorder = async (newBlocks: LessonBlock[]) => {
        setBlocks(newBlocks);
        // Persist order
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
            fetchLessonData(); // Revert
        }
    };

    const handleCreateBlock = async (type: any) => {
        if (!id) return;
        try {
            // Find max order in current filtered view
            const relevantBlocks = blocks.filter(b => b.section_id === activeSectionId || (!activeSectionId && !b.section_id));
            const maxOrder = relevantBlocks.length > 0 ? Math.max(...relevantBlocks.map(b => b.order_index)) : -1;

            const { data, error } = await supabase.from('lesson_blocks').insert({
                lesson_id: id,
                section_id: activeSectionId || null,
                type: type,
                order_index: maxOrder + 1,
                content_ar: '', // Init empty
            } as any).select().single();

            if (error) throw error;
            setBlocks([...blocks, data as any]);
            toast.success(t('تم إضافة محتوى', 'Content added'));
        } catch (error) {
            toast.error(t('فشل في إضافة المحتوى', 'Failed to add content'));
        }
    };

    const handleUpdateBlock = async (blockId: string, data: Partial<LessonBlock>) => {
        setBlocks(blocks.map(b => b.id === blockId ? { ...b, ...data } : b));

        try {
            const { error } = await supabase.from('lesson_blocks').update(data as any).eq('id', blockId);
            if (error) throw error;
        } catch (error) {
            console.error(error);
            toast.error(t('فشل في الحفظ', 'Failed to save'));
        }
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
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                            {direction === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                        </Button>
                        <h1 className="font-medium text-sm truncate max-w-[200px]">{lesson.title_ar}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                            {t('معاينة', 'Preview')}
                        </Button>
                        <Button size="sm">
                            {t('حفظ', 'Save')}
                        </Button>
                    </div>
                </div>

                {/* Editor Canvas */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-3xl mx-auto min-h-[500px]">
                        <BlockEditor
                            blocks={blocks.filter(b => b.section_id === activeSectionId || (!activeSectionId && !b.section_id))}
                            onReorder={handleBlockReorder}
                            onCreateBlock={handleCreateBlock}
                            onUpdateBlock={handleUpdateBlock}
                            onDeleteBlock={handleDeleteBlock}
                        />

                        {blocks.length === 0 && (
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
