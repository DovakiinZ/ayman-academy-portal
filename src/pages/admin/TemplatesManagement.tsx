/**
 * TemplatesManagement — Admin page for token-based template system
 *
 * Features:
 * - Left sidebar: templates grouped by type
 * - Main editor: AR/EN tabs with textarea
 * - Token picker panel: click to insert {{token}} at cursor
 * - Live preview panel: renders with sample data
 * - Save (verified), Reset, Duplicate
 * - No dummy data. No crashes. Errors are toasted.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { verifiedUpdate, verifiedInsert, devLog } from '@/lib/adminDb';
import { Template, TemplateType, TemplateVariable } from '@/types/database';
import { renderTemplate, SAMPLE_TOKEN_VALUES, SAMPLE_TOKEN_VALUES_EN } from '@/lib/templateRenderer';
import { printCertificate } from '@/lib/printUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Loader2,
    Save,
    RotateCcw,
    Search,
    RefreshCw,
    AlertCircle,
    Copy,
    Eye,
    Pencil,
    Award,
    Mail,
    MessageSquare,
    LayoutGrid,
    Plus,
    ChevronRight,
    Printer,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ============================================
// TYPE CONFIG
// ============================================

const TYPE_CONFIG: Record<TemplateType, {
    label: { ar: string; en: string };
    icon: typeof Award;
    color: string;
}> = {
    certificate: {
        label: { ar: 'الشهادات', en: 'Certificates' },
        icon: Award,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    message: {
        label: { ar: 'الرسائل', en: 'Messages' },
        icon: MessageSquare,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    email: {
        label: { ar: 'البريد الإلكتروني', en: 'Email' },
        icon: Mail,
        color: 'text-green-600 bg-green-50 border-green-200',
    },
    page_block: {
        label: { ar: 'كتل الصفحات', en: 'Page Blocks' },
        icon: LayoutGrid,
        color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
};

const TEMPLATE_TYPES: TemplateType[] = ['certificate', 'message', 'email', 'page_block'];

// ============================================
// COMPONENT
// ============================================

export default function TemplatesManagement() {
    const { t, language } = useLanguage();
    const mountedRef = useRef(true);

    // Data
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [templates, setTemplates] = useState<Template[]>([]);

    // Filters
    const [selectedType, setSelectedType] = useState<TemplateType | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Editor
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [editForm, setEditForm] = useState<{
        content_ar: string;
        content_en: string;
        title_ar: string;
        title_en: string;
    }>({ content_ar: '', content_en: '', title_ar: '', title_en: '' });
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [activeTab, setActiveTab] = useState<'ar' | 'en'>('ar');
    const [showPreview, setShowPreview] = useState(true);

    // Textarea refs for cursor insertion
    const arTextareaRef = useRef<HTMLTextAreaElement>(null);
    const enTextareaRef = useRef<HTMLTextAreaElement>(null);

    // ============================================
    // LIFECYCLE
    // ============================================

    useEffect(() => {
        mountedRef.current = true;
        fetchTemplates();
        return () => { mountedRef.current = false; };
    }, []);

    // Track changes
    useEffect(() => {
        if (selectedTemplate) {
            const changed =
                editForm.content_ar !== (selectedTemplate.content_ar || '') ||
                editForm.content_en !== (selectedTemplate.content_en || '') ||
                editForm.title_ar !== (selectedTemplate.title_ar || '') ||
                editForm.title_en !== (selectedTemplate.title_en || '');
            setHasChanges(changed);
        } else {
            setHasChanges(false);
        }
    }, [editForm, selectedTemplate]);

    // ============================================
    // FETCH
    // ============================================

    const fetchTemplates = async () => {
        setLoading(true);
        setError(null);
        devLog('Fetching templates...');

        try {
            const { data, error: fetchError } = await supabase
                .from('templates')
                .select('*')
                .order('type')
                .order('key');

            if (!mountedRef.current) return;

            if (fetchError) {
                devLog('Templates fetch error', fetchError);
                setError(fetchError.message);
                toast.error(t('فشل تحميل القوالب', 'Failed to load templates'), { description: fetchError.message });
                setTemplates([]);
            } else {
                setTemplates((data as Template[]) || []);
            }
        } catch (err) {
            if (!mountedRef.current) return;
            const message = err instanceof Error ? err.message : 'Unknown error';
            devLog('Fetch exception', err);
            setError(message);
            toast.error(t('حدث خطأ', 'An error occurred'), { description: message });
            setTemplates([]);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    // ============================================
    // FILTER
    // ============================================

    const filteredTemplates = templates.filter(tpl => {
        const matchesType = selectedType === 'all' || tpl.type === selectedType;
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
            tpl.key.toLowerCase().includes(q) ||
            tpl.title_ar.toLowerCase().includes(q) ||
            tpl.title_en.toLowerCase().includes(q) ||
            tpl.description?.toLowerCase().includes(q);
        return matchesType && matchesSearch;
    });

    const groupedTemplates = TEMPLATE_TYPES.reduce((acc, type) => {
        const items = filteredTemplates.filter(tpl => tpl.type === type);
        if (items.length > 0) acc[type] = items;
        return acc;
    }, {} as Record<TemplateType, Template[]>);

    // ============================================
    // SELECTION
    // ============================================

    const handleSelectTemplate = (template: Template) => {
        if (hasChanges && selectedTemplate) {
            if (!confirm(t('لديك تغييرات غير محفوظة. هل تريد المتابعة؟', 'You have unsaved changes. Continue?'))) {
                return;
            }
        }
        setSelectedTemplate(template);
        setEditForm({
            content_ar: template.content_ar || '',
            content_en: template.content_en || '',
            title_ar: template.title_ar || '',
            title_en: template.title_en || '',
        });
        setHasChanges(false);
    };

    // ============================================
    // SAVE
    // ============================================

    const handleSave = async () => {
        if (!selectedTemplate) return;
        setSaving(true);

        try {
            const updatePayload = {
                content_ar: editForm.content_ar,
                content_en: editForm.content_en,
                title_ar: editForm.title_ar,
                title_en: editForm.title_en,
                updated_at: new Date().toISOString(),
            };

            const result = await verifiedUpdate(
                'templates',
                selectedTemplate.id,
                updatePayload,
                {
                    successMessage: { ar: 'تم حفظ القالب بنجاح', en: 'Template saved successfully' },
                    errorMessage: { ar: 'فشل حفظ القالب', en: 'Failed to save template' },
                }
            );

            if (result.success) {
                const updated = { ...selectedTemplate, ...updatePayload };
                setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
                setSelectedTemplate(updated);
                setHasChanges(false);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('حدث خطأ', 'An error occurred'), { description: msg });
        } finally {
            setSaving(false);
        }
    };

    // ============================================
    // RESET
    // ============================================

    const handleReset = () => {
        if (selectedTemplate) {
            setEditForm({
                content_ar: selectedTemplate.content_ar || '',
                content_en: selectedTemplate.content_en || '',
                title_ar: selectedTemplate.title_ar || '',
                title_en: selectedTemplate.title_en || '',
            });
            setHasChanges(false);
        }
    };

    // ============================================
    // DUPLICATE
    // ============================================

    const handleDuplicate = async () => {
        if (!selectedTemplate) return;
        setSaving(true);

        try {
            const newKey = `${selectedTemplate.key}_copy_${Date.now()}`;
            const result = await verifiedInsert(
                'templates',
                {
                    key: newKey,
                    title_ar: `${selectedTemplate.title_ar} (نسخة)`,
                    title_en: `${selectedTemplate.title_en} (Copy)`,
                    description: selectedTemplate.description,
                    type: selectedTemplate.type,
                    content_ar: editForm.content_ar,
                    content_en: editForm.content_en,
                    variables: selectedTemplate.variables,
                    is_active: false,
                },
                {
                    successMessage: { ar: 'تم نسخ القالب', en: 'Template duplicated' },
                    errorMessage: { ar: 'فشل نسخ القالب', en: 'Failed to duplicate template' },
                }
            );

            if (result.success && result.data) {
                await fetchTemplates();
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('حدث خطأ', 'An error occurred'), { description: msg });
        } finally {
            setSaving(false);
        }
    };

    // ============================================
    // TOKEN INSERTION
    // ============================================

    const insertToken = useCallback((token: string) => {
        const ref = activeTab === 'ar' ? arTextareaRef : enTextareaRef;
        const field = activeTab === 'ar' ? 'content_ar' : 'content_en';
        const el = ref.current;

        if (el) {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const text = editForm[field];
            const insertion = `{{${token}}}`;
            const newText = text.substring(0, start) + insertion + text.substring(end);

            setEditForm(prev => ({ ...prev, [field]: newText }));

            // Restore cursor after React re-render
            requestAnimationFrame(() => {
                el.focus();
                const newPos = start + insertion.length;
                el.setSelectionRange(newPos, newPos);
            });
        } else {
            // Fallback: append
            setEditForm(prev => ({
                ...prev,
                [field]: prev[field] + `{{${token}}}`,
            }));
        }
    }, [activeTab, editForm]);

    // ============================================
    // PREVIEW
    // ============================================

    const previewContent = useCallback(() => {
        const content = activeTab === 'ar' ? editForm.content_ar : editForm.content_en;
        const samples = activeTab === 'ar' ? SAMPLE_TOKEN_VALUES : SAMPLE_TOKEN_VALUES_EN;
        const allowedTokens = selectedTemplate?.variables?.map(v => v.token);
        return renderTemplate(content, samples, { allowedTokens, escapeValues: false });
    }, [activeTab, editForm, selectedTemplate]);

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('إدارة القوالب', 'Templates Management')}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {t('إنشاء وتعديل القوالب مع دعم الرموز المتغيرة', 'Create and edit templates with token support')}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchTemplates()} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 me-2 ${loading ? 'animate-spin' : ''}`} />
                    {t('تحديث', 'Refresh')}
                </Button>
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
                        <Button variant="outline" size="sm" onClick={() => fetchTemplates()}>
                            <RefreshCw className="w-4 h-4 me-2" />
                            {t('إعادة المحاولة', 'Retry')}
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex gap-4 overflow-hidden">
                {/* ======================== LEFT SIDEBAR ======================== */}
                <div className="w-80 flex-shrink-0 flex flex-col bg-background border border-border rounded-lg overflow-hidden">
                    {/* Search */}
                    <div className="p-3 border-b border-border">
                        <div className="relative">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={t('بحث...', 'Search...')}
                                className="ps-9 h-9 text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Type filter pills */}
                    <div className="px-3 py-2 border-b border-border flex gap-1.5 overflow-x-auto scrollbar-none">
                        <button
                            onClick={() => setSelectedType('all')}
                            className={`px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap transition-colors font-medium
                                ${selectedType === 'all'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                        >
                            {t('الكل', 'All')} ({templates.length})
                        </button>
                        {TEMPLATE_TYPES.map(type => {
                            const config = TYPE_CONFIG[type];
                            const count = templates.filter(tpl => tpl.type === type).length;
                            return (
                                <button
                                    key={type}
                                    onClick={() => setSelectedType(type)}
                                    className={`px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap transition-colors font-medium
                                        ${selectedType === type
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                                >
                                    {t(config.label.ar, config.label.en)} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Template List (grouped by type) */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : Object.keys(groupedTemplates).length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground text-sm">
                                {t('لا توجد قوالب', 'No templates found')}
                            </div>
                        ) : (
                            Object.entries(groupedTemplates).map(([type, items]) => {
                                const config = TYPE_CONFIG[type as TemplateType];
                                const TypeIcon = config.icon;
                                return (
                                    <div key={type} className="mb-1">
                                        <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <TypeIcon className="w-3.5 h-3.5" />
                                            {t(config.label.ar, config.label.en)}
                                        </div>
                                        {items.map(template => (
                                            <button
                                                key={template.id}
                                                onClick={() => handleSelectTemplate(template)}
                                                className={`w-full text-start px-3 py-2.5 transition-colors border-s-2
                                                    ${selectedTemplate?.id === template.id
                                                        ? 'bg-primary/5 border-s-primary'
                                                        : 'border-s-transparent hover:bg-secondary/50'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <ChevronRight className={`w-3 h-3 transition-transform ${selectedTemplate?.id === template.id ? 'rotate-90 text-primary' : 'text-muted-foreground'}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {language === 'ar' ? template.title_ar : template.title_en}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground truncate mt-0.5" dir="ltr">
                                                            {template.key}
                                                        </p>
                                                    </div>
                                                    {!template.is_active && (
                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                                            {t('معطل', 'Inactive')}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ======================== MAIN EDITOR ======================== */}
                <div className="flex-1 flex flex-col bg-background border border-border rounded-lg overflow-hidden">
                    {selectedTemplate ? (
                        <>
                            {/* Editor Header */}
                            <div className="p-4 border-b border-border bg-secondary/10 flex justify-between items-start gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const Icon = TYPE_CONFIG[selectedTemplate.type]?.icon || LayoutGrid;
                                            return <Icon className="w-5 h-5 text-primary flex-shrink-0" />;
                                        })()}
                                        <h2 className="font-semibold text-lg truncate">
                                            {language === 'ar' ? editForm.title_ar : editForm.title_en}
                                        </h2>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 truncate" dir="ltr">{selectedTemplate.key}</p>
                                    {selectedTemplate.description && (
                                        <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.description}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {hasChanges && (
                                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded whitespace-nowrap">
                                            {t('تغييرات غير محفوظة', 'Unsaved')}
                                        </span>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} title={t('معاينة', 'Preview')}>
                                        <Eye className={`w-4 h-4 ${showPreview ? 'text-primary' : ''}`} />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => {
                                        const content = previewContent();
                                        const isCert = selectedTemplate.type === 'certificate';
                                        const finalHtml = isCert
                                            ? `<div class="is-certificate"><div class="preview-content">${content}</div></div>`
                                            : `<div class="preview-content">${content}</div>`;
                                        printCertificate(finalHtml, { title: language === 'ar' ? editForm.title_ar : editForm.title_en });
                                    }} title={t('طباعة', 'Print')}>
                                        <Printer className="w-4 h-4 me-1.5" />
                                        {t('طباعة', 'Print')}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={saving}>
                                        <Copy className="w-4 h-4 me-1.5" />
                                        {t('نسخ', 'Duplicate')}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleReset} disabled={saving || !hasChanges}>
                                        <RotateCcw className="w-4 h-4 me-1.5" />
                                        {t('إعادة', 'Reset')}
                                    </Button>
                                    <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
                                        {saving ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" /> : <Save className="w-4 h-4 me-1.5" />}
                                        {t('حفظ', 'Save')}
                                    </Button>
                                </div>
                            </div>

                            {/* Editor Body */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Title fields */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('العنوان (عربي)', 'Title (Arabic)')}</label>
                                        <Input
                                            value={editForm.title_ar}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, title_ar: e.target.value }))}
                                            dir="rtl"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('العنوان (إنجليزي)', 'Title (English)')}</label>
                                        <Input
                                            value={editForm.title_en}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, title_en: e.target.value }))}
                                            dir="ltr"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Token Picker */}
                                {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                                    <div className="bg-secondary/30 border border-border rounded-lg p-3">
                                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                                            <Plus className="w-3.5 h-3.5" />
                                            {t('إدراج متغير (انقر للإضافة)', 'Insert Token (click to add)')}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedTemplate.variables.map((v: TemplateVariable) => (
                                                <button
                                                    key={v.token}
                                                    onClick={() => insertToken(v.token)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono border
                                                        bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40
                                                        transition-colors cursor-pointer"
                                                    title={language === 'ar' ? v.label_ar : v.label_en}
                                                >
                                                    <span className="opacity-50">{'{'}{'{'}</span>
                                                    {v.token}
                                                    <span className="opacity-50">{'}'}{'}'}</span>
                                                    <span className="text-[10px] text-muted-foreground font-sans ms-1">
                                                        {language === 'ar' ? v.label_ar : v.label_en}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Content Tabs */}
                                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ar' | 'en')} className="w-full">
                                    <TabsList className="w-full grid grid-cols-2 mb-3">
                                        <TabsTrigger value="ar" className="gap-1.5">
                                            <Pencil className="w-3.5 h-3.5" />
                                            {t('العربية', 'Arabic')}
                                        </TabsTrigger>
                                        <TabsTrigger value="en" className="gap-1.5">
                                            <Pencil className="w-3.5 h-3.5" />
                                            {t('الإنجليزية', 'English')}
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="ar" className="mt-0">
                                        <Textarea
                                            ref={arTextareaRef}
                                            value={editForm.content_ar}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, content_ar: e.target.value }))}
                                            className="min-h-[200px] font-sans text-base leading-relaxed"
                                            dir="rtl"
                                            placeholder={t('أدخل محتوى القالب العربي...', 'Enter Arabic template content...')}
                                        />
                                    </TabsContent>

                                    <TabsContent value="en" className="mt-0">
                                        <Textarea
                                            ref={enTextareaRef}
                                            value={editForm.content_en}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, content_en: e.target.value }))}
                                            className="min-h-[200px] font-sans text-base leading-relaxed"
                                            dir="ltr"
                                            placeholder="Enter English template content..."
                                        />
                                    </TabsContent>
                                </Tabs>

                                {/* Live Preview */}
                                {showPreview && (
                                    <div className="border border-border rounded-lg overflow-hidden">
                                        <div className="bg-secondary/30 px-4 py-2 border-b border-border flex items-center gap-2 no-print">
                                            <Eye className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-semibold text-muted-foreground">
                                                {t('معاينة مباشرة', 'Live Preview')}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded ms-auto">
                                                {t('بيانات تجريبية', 'Sample Data')}
                                            </span>
                                        </div>
                                        <div
                                            className={cn(
                                                "p-6 bg-background text-foreground leading-relaxed text-base min-h-[80px] print-container",
                                                selectedTemplate.type === 'certificate' && "is-certificate"
                                            )}
                                            dir={activeTab === 'ar' ? 'rtl' : 'ltr'}
                                        >
                                            <div className="preview-content">
                                                {previewContent() || (
                                                    <span className="text-muted-foreground italic text-sm no-print">
                                                        {t('المحتوى فارغ', 'Content is empty')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Empty state */
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center">
                                <Award className="w-8 h-8 opacity-30" />
                            </div>
                            <p className="text-sm">{t('اختر قالباً للتعديل', 'Select a template to edit')}</p>
                            <p className="text-xs text-muted-foreground/60 max-w-xs text-center">
                                {t(
                                    'اختر أحد القوالب من القائمة على اليمين لعرض وتعديل محتواه، أو قم بنسخ قالب موجود لإنشاء قالب جديد.',
                                    'Select a template from the sidebar to view and edit its content, or duplicate an existing template to create a new one.'
                                )}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
