/**
 * TemplatesManagement - Admin page to edit dynamic text templates
 * Admins can modify text content for pages like Home, Stages, Paywall etc.
 */

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { verifiedUpdate, devLog } from '@/lib/adminDb';
import { ContentTemplate } from '@/types/database';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTemplates } from '@/contexts/TemplateContext';
import {
    Loader2,
    Save,
    RotateCcw,
    Type,
    LayoutTemplate,
    Search,
    Info,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const CATEGORIES = [
    { id: 'all', label: { ar: 'الكل', en: 'All' } },
    { id: 'home', label: { ar: 'الصفحة الرئيسية', en: 'Home Page' } },
    { id: 'stages', label: { ar: 'المراحل', en: 'Stages' } },
    { id: 'subjects', label: { ar: 'المواد', en: 'Subjects' } },
    { id: 'lesson', label: { ar: 'الدروس', en: 'Lessons' } },
    { id: 'paywall', label: { ar: 'الاشتراكات', en: 'Paywall & Subscriptions' } },
];

export default function TemplatesManagement() {
    const { t } = useLanguage();
    const { refreshTemplates } = useTemplates();
    const mountedRef = useRef(true);

    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [templates, setTemplates] = useState<ContentTemplate[]>([]);

    // Filters
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Editor state
    const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
    const [editForm, setEditForm] = useState<{ ar: string; en: string }>({ ar: '', en: '' });
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [activeTab, setActiveTab] = useState('ar');

    useEffect(() => {
        mountedRef.current = true;
        fetchTemplates();

        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Track changes
    useEffect(() => {
        if (selectedTemplate) {
            const arChanged = editForm.ar !== (selectedTemplate.content_ar || '');
            const enChanged = editForm.en !== (selectedTemplate.content_en || '');
            setHasChanges(arChanged || enChanged);
        } else {
            setHasChanges(false);
        }
    }, [editForm, selectedTemplate]);

    const fetchTemplates = async () => {
        setLoading(true);
        setError(null);
        const startTime = Date.now();
        devLog('Fetching templates...');

        try {
            const { data, error: fetchError } = await supabase
                .from('content_templates')
                .select('*')
                .order('category')
                .order('key');

            if (!mountedRef.current) return;

            if (fetchError) {
                devLog('Templates fetch error', fetchError);
                setError(fetchError.message);
                toast.error('فشل تحميل القوالب', { description: fetchError.message });
                setTemplates([]);
            } else {
                setTemplates((data as ContentTemplate[]) || []);
            }

            const duration = Date.now() - startTime;
            devLog(`Templates loaded in ${duration}ms`, { count: data?.length || 0 });
        } catch (err) {
            if (!mountedRef.current) return;
            const message = err instanceof Error ? err.message : 'Unknown error';
            devLog('Fetch exception', err);
            setError(message);
            toast.error('حدث خطأ', { description: message });
            setTemplates([]);
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    };

    const handleRetry = () => {
        fetchTemplates();
    };

    const filteredTemplates = templates.filter(template => {
        const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
        const matchesSearch = template.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleSelectTemplate = (template: ContentTemplate) => {
        // Check for unsaved changes
        if (hasChanges && selectedTemplate) {
            if (!confirm(t('لديك تغييرات غير محفوظة. هل تريد المتابعة؟', 'You have unsaved changes. Do you want to continue?'))) {
                return;
            }
        }

        setSelectedTemplate(template);
        setEditForm({
            ar: template.content_ar || '',
            en: template.content_en || ''
        });
        setHasChanges(false);
    };

    const handleSave = async () => {
        if (!selectedTemplate) return;

        setSaving(true);

        try {
            const result = await verifiedUpdate(
                'content_templates',
                selectedTemplate.id,
                {
                    content_ar: editForm.ar,
                    content_en: editForm.en,
                    updated_at: new Date().toISOString()
                },
                {
                    successMessage: { ar: 'تم الحفظ بنجاح', en: 'Saved successfully' },
                    errorMessage: { ar: 'حدث خطأ أثناء الحفظ', en: 'Error saving template' },
                }
            );

            if (result.success) {
                // Update local state
                setTemplates(templates.map(t =>
                    t.id === selectedTemplate.id
                        ? { ...t, content_ar: editForm.ar, content_en: editForm.en }
                        : t
                ));

                // Update selected template
                setSelectedTemplate({
                    ...selectedTemplate,
                    content_ar: editForm.ar,
                    content_en: editForm.en
                });

                setHasChanges(false);

                // Refresh global context cache
                await refreshTemplates();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('حدث خطأ', 'An error occurred'), { description: message });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (selectedTemplate) {
            setEditForm({
                ar: selectedTemplate.content_ar || '',
                en: selectedTemplate.content_en || ''
            });
            setHasChanges(false);
        }
    };

    const extractVariables = (text: string) => {
        // Find all {{variable}} patterns
        const regex = /{{([^}]+)}}/g;
        const vars = new Set<string>();
        let match;
        while ((match = regex.exec(text)) !== null) {
            vars.add(match[1]);
        }
        return Array.from(vars);
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('إدارة النصوص والقوالب', 'Templates Management')}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('تعديل نصوص الموقع والقوالب الديناميكية', 'Edit website text and dynamic templates')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isDummy && !loading && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700">
                            <Beaker className="w-3.5 h-3.5" />
                            {t('بيانات تجريبية', 'Demo Data')}
                        </div>
                    )}
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-destructive">{t('حدث خطأ', 'An error occurred')}</p>
                            <p className="text-xs text-destructive/80">{error}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleRetry}>
                            <RefreshCw className="w-4 h-4 me-2" />
                            {t('إعادة المحاولة', 'Retry')}
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Sidebar - Template List */}
                <div className="w-1/3 flex flex-col bg-background border border-border rounded-lg overflow-hidden">
                    {/* Filters */}
                    <div className="p-4 border-b border-border space-y-3">
                        <div className="relative">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={t('بحث عن قالب...', 'Search templates...')}
                                className="ps-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`
                                        px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors
                                        ${selectedCategory === cat.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}
                                    `}
                                >
                                    {t(cat.label.ar, cat.label.en)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground text-sm">
                                {t('لا توجد قوالب', 'No templates found')}
                            </div>
                        ) : (
                            filteredTemplates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => handleSelectTemplate(template)}
                                    className={`
                                        w-full text-start p-3 rounded-md transition-colors border
                                        ${selectedTemplate?.id === template.id
                                            ? 'bg-primary/5 border-primary'
                                            : 'bg-transparent border-transparent hover:bg-secondary'}
                                    `}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-sm truncate" dir="ltr">
                                            {template.key}
                                        </span>
                                        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                                            {template.category}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {template.description || t('لا يوجد وصف', 'No description')}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Editor */}
                <div className="flex-1 bg-background border border-border rounded-lg overflow-hidden flex flex-col">
                    {selectedTemplate ? (
                        <>
                            <div className="p-4 border-b border-border bg-secondary/10 flex justify-between items-start">
                                <div>
                                    <h2 className="font-semibold text-lg flex items-center gap-2" dir="ltr">
                                        <LayoutTemplate className="w-5 h-5 text-primary" />
                                        {selectedTemplate.key}
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {selectedTemplate.description}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {hasChanges && (
                                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                            {t('تغييرات غير محفوظة', 'Unsaved changes')}
                                        </span>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleReset}
                                        disabled={saving || !hasChanges}
                                    >
                                        <RotateCcw className="w-4 h-4 me-2" />
                                        {t('إعادة تعيين', 'Reset')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSave}
                                        disabled={saving || !hasChanges}
                                    >
                                        {saving ? (
                                            <Loader2 className="w-4 h-4 me-2 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4 me-2" />
                                        )}
                                        {t('حفظ التغييرات', 'Save Changes')}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="w-full grid grid-cols-2 mb-4">
                                        <TabsTrigger value="ar">{t('العربية', 'Arabic')}</TabsTrigger>
                                        <TabsTrigger value="en">{t('الإنجليزية', 'English')}</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="ar" className="mt-0">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium flex items-center gap-2">
                                                <span className="text-primary">AR</span>
                                                {t('النص العربي', 'Arabic Content')}
                                            </label>
                                            <Textarea
                                                value={editForm.ar}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, ar: e.target.value }))}
                                                className="min-h-[300px] font-sans text-lg leading-relaxed"
                                                dir="rtl"
                                                placeholder="أدخل النص العربي..."
                                            />
                                            <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                                                {extractVariables(editForm.ar).map(v => (
                                                    <span key={v} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                        {`{{${v}}}`}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="en" className="mt-0">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium flex items-center gap-2">
                                                <span className="text-primary">EN</span>
                                                {t('النص الإنجليزي', 'English Content')}
                                            </label>
                                            <Textarea
                                                value={editForm.en}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, en: e.target.value }))}
                                                className="min-h-[300px] font-sans text-lg leading-relaxed"
                                                dir="ltr"
                                                placeholder="Enter English content..."
                                            />
                                            <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                                                {extractVariables(editForm.en).map(v => (
                                                    <span key={v} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                        {`{{${v}}}`}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                {/* Preview Info */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-start gap-3">
                                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                                                {t('كيفية استخدام المتغيرات', 'How to use variables')}
                                            </p>
                                            <p className="text-blue-700 dark:text-blue-400 leading-relaxed">
                                                {t(
                                                    'يمكنك استخدام المتغيرات بوضعها بين قوسين، مثال: {{name}}. سيتم استبدال هذه القيم تلقائياً عند عرض الصفحة.',
                                                    'You can use variables by placing them in braces, e.g. {{name}}. These values will be replaced automatically when the page is rendered.'
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <Type className="w-12 h-12 mb-4 opacity-20" />
                            <p>{t('اختر قالباً للتعديل', 'Select a template to edit')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
