import { useLanguage } from '@/contexts/LanguageContext';
import { LessonSection } from '@/types/database';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GripVertical, FolderOpen, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LessonOutlineProps {
    sections: LessonSection[];
    activeSectionId: string | null;
    onSelectSection: (id: string) => void;
    onReorder?: (sections: LessonSection[]) => void;
}

export default function LessonOutline({ sections, activeSectionId, onSelectSection }: LessonOutlineProps) {
    const { t } = useLanguage();

    return (
        <div className="space-y-1">
            {sections.map((section) => (
                <div
                    key={section.id}
                    onClick={() => onSelectSection(section.id)}
                    className={cn(
                        "group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
                        activeSectionId === section.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-50 cursor-grab" />
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span className="truncate flex-1">
                        {t(section.title_ar, section.title_en || section.title_ar)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-3 h-3" />
                    </Button>
                </div>
            ))}

            {sections.length === 0 && (
                <div className="text-center py-8 px-4 text-xs text-muted-foreground border border-dashed border-border rounded-md m-2">
                    {t('لا توجد أقسام بعد', 'No sections yet')}
                </div>
            )}
        </div>
    );
}
