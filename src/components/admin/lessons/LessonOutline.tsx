import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LessonSection, LessonBlock } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, FolderOpen, Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface LessonOutlineProps {
    sections: LessonSection[];
    blocks: LessonBlock[];
    activeSectionId: string | null;
    onSelectSection: (id: string | null) => void;
    onReorder?: (sections: LessonSection[]) => void;
    onCreateSection: (title: string) => void;
    onUpdateSection: (id: string, title: string) => void;
    onDeleteSection: (id: string) => void;
}

export default function LessonOutline({
    sections,
    blocks,
    activeSectionId,
    onSelectSection,
    onCreateSection,
    onUpdateSection,
    onDeleteSection
}: LessonOutlineProps) {
    const { t } = useLanguage();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [showNewSection, setShowNewSection] = useState(false);
    const [newSectionTitle, setNewSectionTitle] = useState('');

    const getBlockCount = (sectionId: string) => {
        return blocks.filter(b => b.section_id === sectionId).length;
    };

    const startEdit = (section: LessonSection) => {
        setEditingId(section.id);
        setEditTitle(section.title_ar);
    };

    const commitEdit = () => {
        if (editingId && editTitle.trim()) {
            onUpdateSection(editingId, editTitle.trim());
        }
        setEditingId(null);
        setEditTitle('');
    };

    const handleCreateSection = () => {
        if (newSectionTitle.trim()) {
            onCreateSection(newSectionTitle.trim());
            setNewSectionTitle('');
            setShowNewSection(false);
        }
    };

    return (
        <div className="space-y-1">
            {/* Unsectioned blocks entry */}
            <div
                onClick={() => onSelectSection(null)}
                className={cn(
                    "group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
                    activeSectionId === null
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                )}
            >
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="truncate flex-1">{t('بدون قسم', 'Unsectioned')}</span>
                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                    {blocks.filter(b => !b.section_id).length}
                </span>
            </div>

            {/* Sections */}
            {sections.map((section) => (
                <div key={section.id}>
                    {editingId === section.id ? (
                        <div className="flex items-center gap-1 px-1 py-0.5">
                            <Input
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                                className="h-7 text-xs"
                                autoFocus
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={commitEdit}>
                                <Check className="w-3 h-3 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    ) : (
                        <div
                            onClick={() => onSelectSection(section.id)}
                            className={cn(
                                "group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
                                activeSectionId === section.id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-50 cursor-grab flex-shrink-0" />
                            <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate flex-1">
                                {t(section.title_ar, section.title_en || section.title_ar)}
                            </span>
                            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full flex-shrink-0">
                                {getBlockCount(section.id)}
                            </span>
                            {/* Context actions */}
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-5 w-5"
                                    onClick={(e) => { e.stopPropagation(); startEdit(section); }}
                                >
                                    <Pencil className="w-2.5 h-2.5" />
                                </Button>
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-5 w-5 text-destructive"
                                    onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }}
                                >
                                    <Trash2 className="w-2.5 h-2.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {/* New Section Input */}
            {showNewSection ? (
                <div className="flex items-center gap-1 px-1 py-0.5 mt-2">
                    <Input
                        value={newSectionTitle}
                        onChange={e => setNewSectionTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateSection(); if (e.key === 'Escape') setShowNewSection(false); }}
                        placeholder={t('اسم القسم', 'Section name')}
                        className="h-7 text-xs"
                        autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreateSection}>
                        <Check className="w-3 h-3 text-green-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNewSection(false)}>
                        <X className="w-3 h-3" />
                    </Button>
                </div>
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-xs text-muted-foreground mt-2"
                    onClick={() => setShowNewSection(true)}
                >
                    <Plus className="w-3 h-3" />
                    {t('إضافة قسم', 'Add Section')}
                </Button>
            )}

            {sections.length === 0 && !showNewSection && (
                <div className="text-center py-6 px-4 text-xs text-muted-foreground border border-dashed border-border rounded-md m-2">
                    {t('لا توجد أقسام بعد', 'No sections yet')}
                </div>
            )}
        </div>
    );
}
