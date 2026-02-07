import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettings, SystemSettingKey } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, RefreshCw, Settings, Layout, DollarSign, Award } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
    const { t } = useLanguage();
    const { settings, updateSetting, refresh, isLoading } = useSettings();
    const [saving, setSaving] = useState(false);
    const [localSettings, setLocalSettings] = useState<Record<string, any>>({});

    // Sync local state when settings load
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleChange = (key: SystemSettingKey, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async (categoryKeys: string[]) => {
        setSaving(true);
        try {
            const promises = categoryKeys.map(key => {
                if (localSettings[key] !== undefined) {
                    return updateSetting(key, localSettings[key]);
                }
                return Promise.resolve(true);
            });

            await Promise.all(promises);
            await refresh();
            toast.success(t('تم حفظ الإعدادات بنجاح', 'Settings saved successfully'));
        } catch (error) {
            toast.error(t('فشل حفظ الإعدادات', 'Failed to save settings'));
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('إعدادات النظام', 'System Settings')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('التحكم في خصائص ومحازير النظام بالكامل', 'Control system features and constraints globally')}
                </p>
            </div>

            <Tabs defaultValue="ui" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="ui">{t('واجهة المستخدم', 'UI & UX')}</TabsTrigger>
                    <TabsTrigger value="home">{t('الرئيسية', 'Home Page')}</TabsTrigger>
                    <TabsTrigger value="completion">{t('الإكمال', 'Completion')}</TabsTrigger>
                    <TabsTrigger value="paywall">{t('الاشتراكات', 'Paywall')}</TabsTrigger>
                </TabsList>

                {/* UI Settings */}
                <TabsContent value="ui" className="space-y-6 mt-6">
                    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">{t('نظام التقييم', 'Ratings System')}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('تفعيل إمكانية تقييم الدروس والمواد', 'Enable rating for lessons and subjects')}
                                </p>
                            </div>
                            <Switch
                                checked={localSettings['ui.enable_ratings'] ?? true}
                                onCheckedChange={(c) => handleChange('ui.enable_ratings', c)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">{t('التعليقات والمناقشات', 'Comments & Discussions')}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('السماح للطلاب بكتابة تعليقات على الدروس', 'Allow students to post comments on lessons')}
                                </p>
                            </div>
                            <Switch
                                checked={localSettings['ui.enable_comments'] ?? true}
                                onCheckedChange={(c) => handleChange('ui.enable_comments', c)}
                            />
                        </div>
                        <div className="space-y-3">
                            <Label>{t('اللغة الافتراضية', 'Default Language')}</Label>
                            <div className="flex gap-4">
                                <Button
                                    variant={localSettings['ui.default_language'] === 'ar' ? 'default' : 'outline'}
                                    onClick={() => handleChange('ui.default_language', 'ar')}
                                    size="sm"
                                >
                                    العربية
                                </Button>
                                <Button
                                    variant={localSettings['ui.default_language'] === 'en' ? 'default' : 'outline'}
                                    onClick={() => handleChange('ui.default_language', 'en')}
                                    size="sm"
                                >
                                    English
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => handleSave(['ui.enable_ratings', 'ui.enable_comments', 'ui.default_language'])} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                            {t('حفظ التغييرات', 'Save Changes')}
                        </Button>
                    </div>
                </TabsContent>

                {/* Home Settings */}
                <TabsContent value="home" className="space-y-6 mt-6">
                    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">{t('عرض المعلمين المميزين', 'Show Featured Teachers')}</Label>
                            </div>
                            <Switch checked={localSettings['home.show_featured_teachers'] ?? true} onCheckedChange={(c) => handleChange('home.show_featured_teachers', c)} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">{t('عرض المواد المميزة', 'Show Featured Subjects')}</Label>
                            </div>
                            <Switch checked={localSettings['home.show_featured_subjects'] ?? true} onCheckedChange={(c) => handleChange('home.show_featured_subjects', c)} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">{t('عرض أحدث الدروس', 'Show Latest Lessons')}</Label>
                            </div>
                            <Switch checked={localSettings['home.show_featured_lessons'] ?? true} onCheckedChange={(c) => handleChange('home.show_featured_lessons', c)} />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => handleSave([
                            'home.show_featured_teachers',
                            'home.show_featured_subjects',
                            'home.show_featured_lessons'
                        ])} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                            {t('حفظ التغييرات', 'Save Changes')}
                        </Button>
                    </div>
                </TabsContent>

                {/* Completion Settings */}
                <TabsContent value="completion" className="space-y-6 mt-6">
                    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t('نسبة مشاهدة الفيديو لاحتسابه مكتملاً (%)', 'Video watch percentage to mark complete (%)')}</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={localSettings['completion.lesson_complete_percent'] ?? 90}
                                    onChange={(e) => handleChange('completion.lesson_complete_percent', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('نسبة اجتياز الاختبار للحصول على الشهادة (%)', 'Quiz passing score for certificate (%)')}</Label>
                                <Input
                                    type="number"
                                    min="0" // Should be min 0
                                    max="100"
                                    value={localSettings['completion.certificate_threshold_percent'] ?? 90}
                                    onChange={(e) => handleChange('completion.certificate_threshold_percent', Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => handleSave([
                            'completion.lesson_complete_percent',
                            'completion.certificate_threshold_percent'
                        ])} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                            {t('حفظ التغييرات', 'Save Changes')}
                        </Button>
                    </div>
                </TabsContent>

                {/* Paywall Settings */}
                <TabsContent value="paywall" className="space-y-6 mt-6">
                    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">{t('السماح بالمشاهدة المجانية', 'Allow Free Previews')}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('السماح للمستخدمين غير المشتركين بمشاهدة الدروس المجانية', 'Allow non-subscribers to watch free lessons')}
                                </p>
                            </div>
                            <Switch checked={localSettings['paywall.allow_free_preview'] ?? true} onCheckedChange={(c) => handleChange('paywall.allow_free_preview', c)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('عدد الدروس المجانية المسموحة لكل معلم', 'Max free previews per teacher')}</Label>
                            <Input
                                type="number"
                                min="0" // Should be min 0
                                value={localSettings['paywall.free_preview_per_teacher_count'] ?? 3}
                                onChange={(e) => handleChange('paywall.free_preview_per_teacher_count', Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => handleSave([
                            'paywall.allow_free_preview',
                            'paywall.free_preview_per_teacher_count'
                        ])} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                            {t('حفظ التغييرات', 'Save Changes')}
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
