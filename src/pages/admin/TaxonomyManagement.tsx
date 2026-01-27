import { useLanguage } from '@/contexts/LanguageContext';
import { BookOpen, GraduationCap, Layers } from 'lucide-react';

export default function TaxonomyManagement() {
    const { t } = useLanguage();

    const stages = [
        { id: 'tamhidi', name: { ar: 'تمهيدي', en: 'Preparatory' }, subjects: 3 },
        { id: 'ibtidai', name: { ar: 'ابتدائي', en: 'Primary' }, subjects: 5 },
        { id: 'mutawasit', name: { ar: 'متوسط', en: 'Middle' }, subjects: 6 },
    ];

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('التصنيفات', 'Taxonomy')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('إدارة المراحل والمواد الدراسية', 'Manage stages and subjects')}
                </p>
            </div>

            {/* Stages */}
            <div className="mb-8">
                <h2 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    {t('المراحل الدراسية', 'Educational Stages')}
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                    {stages.map((stage) => (
                        <div key={stage.id} className="bg-background rounded-lg border border-border p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-foreground">
                                        {t(stage.name.ar, stage.name.en)}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {stage.subjects} {t('مواد', 'subjects')}
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5 text-primary" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Info */}
            <div className="bg-secondary/50 rounded-lg border border-border p-6">
                <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                        <h3 className="font-medium text-foreground">
                            {t('ملاحظة', 'Note')}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t(
                                'يتم تحديد المراحل والمواد الدراسية مسبقاً. للتعديل، يرجى التواصل مع فريق التطوير.',
                                'Stages and subjects are predefined. To modify, please contact the development team.'
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
