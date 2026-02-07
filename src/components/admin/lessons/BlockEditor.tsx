import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LessonBlock, LessonBlockType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GripVertical, X, Type, Image as ImageIcon, Video, FileText, Link as LinkIcon, AlertTriangle, Lightbulb, Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

interface BlockEditorProps {
    blocks: LessonBlock[];
    onReorder: (blocks: LessonBlock[]) => void;
    onCreateBlock: (type: LessonBlockType) => void;
    onUpdateBlock: (id: string, data: Partial<LessonBlock>) => void;
    onDeleteBlock: (id: string) => void;
}

export default function BlockEditor({ blocks, onReorder, onCreateBlock, onUpdateBlock, onDeleteBlock }: BlockEditorProps) {
    const { t } = useLanguage();
    const sensors = useSensors(useSensor(PointerSensor));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = blocks.findIndex((b) => b.id === active.id);
            const newIndex = blocks.findIndex((b) => b.id === over?.id);
            onReorder(arrayMove(blocks, oldIndex, newIndex));
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                        {blocks.map((block) => (
                            <SortableBlock
                                key={block.id}
                                block={block}
                                onUpdate={onUpdateBlock}
                                onDelete={onDeleteBlock}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Add Block Area */}
            <div className="flex justify-center mt-8">
                <AddBlockMenu onAdd={onCreateBlock} />
            </div>
        </div>
    );
}

function AddBlockMenu({ onAdd }: { onAdd: (type: LessonBlockType) => void }) {
    const { t } = useLanguage();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t('إضافة محتوى', 'Add Content')}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuItem onClick={() => onAdd('rich_text')}>
                    <Type className="w-4 h-4 me-2" />
                    {t('نص', 'Text')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAdd('video')}>
                    <Video className="w-4 h-4 me-2" />
                    {t('فيديو', 'Video')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAdd('image')}>
                    <ImageIcon className="w-4 h-4 me-2" />
                    {t('صورة', 'Image')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAdd('tip')}>
                    <Lightbulb className="w-4 h-4 me-2" />
                    {t('نصيحة', 'Tip')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAdd('warning')}>
                    <AlertTriangle className="w-4 h-4 me-2" />
                    {t('تنبيه', 'Warning')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function SortableBlock({
    block,
    onUpdate,
    onDelete
}: {
    block: LessonBlock;
    onUpdate: (id: string, data: Partial<LessonBlock>) => void;
    onDelete: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
    };

    return (
        <div ref={setNodeRef} style={style} className="group relative pl-10 pr-2 transition-all">
            {/* Drag Handle */}
            <div {...attributes} {...listeners} className="absolute left-0 top-2 p-2 rounded hover:bg-accent cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Block Content Wrapper */}
            <div className="min-h-[3rem] rounded-lg border border-transparent group-hover:border-border/50 bg-background transition-colors p-1 relative">
                <BlockRenderer block={block} updateBlock={onUpdate} />

                {/* Actions */}
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background shadow-sm rounded-md border border-border">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onDelete(block.id)}>
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function BlockRenderer({ block, updateBlock }: { block: LessonBlock, updateBlock: (id: string, data: Partial<LessonBlock>) => void }) {
    switch (block.type) {
        case 'rich_text':
        case 'tip':
        case 'warning':
            return <RichTextBlock block={block} updateBlock={updateBlock} />;
        case 'video':
            return <VideoBlock block={block} updateBlock={updateBlock} />;
        case 'image':
            return <ImageBlock block={block} updateBlock={updateBlock} />;
        default:
            return <div className="p-4 text-sm text-muted-foreground bg-accent/20 rounded">Unknown block type: {block.type}</div>;
    }
}

function RichTextBlock({ block, updateBlock }: { block: LessonBlock, updateBlock: (id: string, data: Partial<LessonBlock>) => void }) {
    const { t } = useLanguage();
    const [localContent, setLocalContent] = useState(block.content_ar || '');

    useEffect(() => {
        setLocalContent(block.content_ar || '');
    }, [block.content_ar]);

    const handleBlur = () => {
        if (localContent !== block.content_ar) {
            updateBlock(block.id, { content_ar: localContent });
        }
    };

    const styles = {
        'rich_text': '',
        'tip': 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4',
        'warning': 'bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-500 p-4'
    };

    return (
        <div className={cn("relative", styles[block.type as keyof typeof styles] || '')}>
            {block.type !== 'rich_text' && (
                <div className="absolute top-2 right-2 text-xs font-bold text-muted-foreground uppercase opacity-50 select-none">
                    {block.type}
                </div>
            )}
            <Textarea
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                onBlur={handleBlur}
                placeholder={t('اكتب هنا...', 'Type here...')}
                className={cn(
                    "min-h-[100px] resize-none border-none shadow-none focus-visible:ring-0 px-0 bg-transparent",
                    block.type === 'rich_text' ? "text-lg" : "text-sm",
                    !localContent && "italic"
                )}
            />
        </div>
    );
}

function VideoBlock({ block, updateBlock }: { block: LessonBlock, updateBlock: (id: string, data: Partial<LessonBlock>) => void }) {
    const { t } = useLanguage();
    const [url, setUrl] = useState(block.url || '');

    const handleBlur = () => {
        if (url !== block.url) {
            updateBlock(block.id, { url: url });
        }
    };

    return (
        <div className="p-4 border rounded-md space-y-3 bg-card">
            <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('فيديو', 'Video')}</span>
            </div>
            <div className="space-y-1">
                <Label className="text-xs">{t('رابط الفيديو', 'Video URL')}</Label>
                <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="https://..."
                    className="h-8"
                />
            </div>
            {block.url && (
                <div className="aspect-video bg-black/5 rounded-md flex items-center justify-center overflow-hidden relative mt-2">
                    <div className="text-xs text-muted-foreground flex flex-col items-center">
                        <Video className="w-8 h-8 mb-2 opacity-20" />
                        {block.url}
                    </div>
                </div>
            )}
        </div>
    );
}

function ImageBlock({ block, updateBlock }: { block: LessonBlock, updateBlock: (id: string, data: Partial<LessonBlock>) => void }) {
    const { t } = useLanguage();
    const [url, setUrl] = useState(block.url || '');

    const handleBlur = () => {
        if (url !== block.url) {
            updateBlock(block.id, { url: url });
        }
    };

    return (
        <div className="p-4 border rounded-md space-y-3 bg-card">
            <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('صورة', 'Image')}</span>
            </div>
            <div className="space-y-1">
                <Label className="text-xs">{t('رابط الصورة', 'Image URL')}</Label>
                <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="https://..."
                    className="h-8"
                />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
                {t('أو', 'Or')} <span className="underline cursor-pointer">{t('اختار ملف', 'Pick file')}</span>
            </div>

            {block.url && (
                <div className="mt-2 rounded-md overflow-hidden bg-accent/10 relative group">
                    <img src={block.url} alt="Preview" className="max-h-64 object-contain mx-auto" />
                </div>
            )}
        </div>
    );
}
