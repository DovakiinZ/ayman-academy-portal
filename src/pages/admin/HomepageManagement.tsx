/**
 * HomepageManagement - Admin page to manage featured content on homepage
 * Tabs: Featured Teachers, Featured Subjects, Featured Lessons
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { Profile, Subject, Lesson } from '@/types/database';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Loader2,
    Save,
    ChevronUp,
    ChevronDown,
    Edit,
    Plus,
    Trash2,
    User,
    BookOpen,
    FileText,
    Eye,
    EyeOff,
    Layers,
} from 'lucide-react';

type TabType = 'stages' | 'teachers' | 'subjects' | 'lessons';

export default function HomepageManagement() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<TabType>('teachers');
    const [loading, setLoading] = useState(true);

    // State for each tab
    const [stages, setStages] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<Profile[]>([]);
    const [featuredSubjects, setFeaturedSubjects] = useState<any[]>([]);
    const [featuredLessons, setFeaturedLessons] = useState<any[]>([]);

    // For adding new items
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const [allLessons, setAllLessons] = useState<Lesson[]>([]);

    // Edit dialogs
    const [editingStage, setEditingStage] = useState<any | null>(null);
    const [editingTeacher, setEditingTeacher] = useState<Profile | null>(null);
    const [editingSubject, setEditingSubject] = useState<any | null>(null);
    const [editingLesson, setEditingLesson] = useState<any | null>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);

        if (activeTab === 'stages') {
            await fetchStages();
        } else if (activeTab === 'teachers') {
            await fetchTeachers();
        } else if (activeTab === 'subjects') {
            await fetchFeaturedSubjects();
            await fetchAllSubjects();
        } else {
            await fetchFeaturedLessons();
            await fetchAllLessons();
        }

        setLoading(false);
    };

    const fetchStages = async () => {
        const { data, error } = await supabase
            .from('stages')
            .select('*')
            .order('home_order', { ascending: true });

        if (error) {
            console.error('Error fetching stages:', error);
            toast.error(t('خطأ في جلب المراحل', 'Error fetching stages'));
        }
        setStages(data || []);
    };

    const fetchTeachers = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'teacher')
            .eq('is_active', true)
            .order('home_order', { ascending: true });
        setTeachers(data || []);
    };

    const fetchFeaturedSubjects = async () => {
        const { data, error } = await supabase
            .from('subjects')
            .select(`
                *,
                stage:stages(title_ar, title_en)
            `)
            .eq('show_on_home', true)
            .order('home_order', { ascending: true });

        if (error) {
            console.error('Error fetching featured subjects:', error);
            toast.error(t('خطأ في جلب المواد المميزة', 'Error fetching featured subjects'));
        }

        setFeaturedSubjects(data || []);
    };

    const fetchFeaturedLessons = async () => {
        const { data, error } = await supabase
            .from('lessons')
            .select(`
                *,
                subject:subjects(title_ar, title_en)
            `)
            .eq('show_on_home', true)
            .order('home_order', { ascending: true });

        if (error) {
            console.error('Error fetching featured lessons:', error);
            toast.error(t('خطأ في جلب الدروس المميزة', 'Error fetching featured lessons'));
        }

        setFeaturedLessons(data || []);
    };

    const fetchAllSubjects = async () => {
        const { data } = await supabase
            .from('subjects')
            .select('id, title_ar, title_en, stage:stages(title_ar, title_en)')
            .eq('is_active', true)
            .order('title_ar');
        setAllSubjects(data as any || []);
    };

    const fetchAllLessons = async () => {
        const { data } = await supabase
            .from('lessons')
            .select('id, title_ar, title_en, subject:subjects(title_ar, title_en)')
            .order('title_ar')
            .limit(100);
        setAllLessons(data as any || []);
    };

    // Teacher actions
    const toggleTeacherVisibility = async (teacher: Profile) => {
        const newValue = !teacher.show_on_home;
        const { error } = await supabase
            .from('profiles')
            .update({ show_on_home: newValue } as any)
            .eq('id', teacher.id);

        if (error) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } else {
            toast.success(newValue ? t('تم الإظهار', 'Now visible') : t('تم الإخفاء', 'Now hidden'));
            fetchTeachers();
        }
    };

    const moveTeacher = async (teacher: Profile, direction: 'up' | 'down') => {
        const currentIndex = teachers.findIndex(t => t.id === teacher.id);
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (newIndex < 0 || newIndex >= teachers.length) return;

        const otherTeacher = teachers[newIndex];

        await supabase.from('profiles').update({ home_order: newIndex } as any).eq('id', teacher.id);
        await supabase.from('profiles').update({ home_order: currentIndex } as any).eq('id', otherTeacher.id);

        fetchTeachers();
    };

    // Stage functions
    const toggleStageVisibility = async (stage: any) => {
        const newValue = !stage.show_on_home;
        const { error } = await supabase
            .from('stages')
            .update({ show_on_home: newValue })
            .eq('id', stage.id);

        if (error) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } else {
            toast.success(newValue ? t('تم الإظهار', 'Now visible') : t('تم الإخفاء', 'Now hidden'));
            fetchStages();
        }
    };

    const moveStage = async (stage: any, direction: 'up' | 'down') => {
        const currentIndex = stages.findIndex(s => s.id === stage.id);
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (newIndex < 0 || newIndex >= stages.length) return;

        const otherStage = stages[newIndex];

        await supabase.from('stages').update({ home_order: newIndex }).eq('id', stage.id);
        await supabase.from('stages').update({ home_order: currentIndex }).eq('id', otherStage.id);

        fetchStages();
    };

    const saveStage = async () => {
        if (!editingStage) return;

        const { error } = await supabase
            .from('stages')
            .update({
                teaser_ar: editingStage.teaser_ar || null,
                teaser_en: editingStage.teaser_en || null,
            })
            .eq('id', editingStage.id);

        if (!error) {
            toast.success(t('تم الحفظ', 'Saved'));
            setEditingStage(null);
            fetchStages();
        }
    };

    const saveTeacher = async () => {
        if (!editingTeacher) return;

        const { error } = await supabase
            .from('profiles')
            .update({
                bio_ar: editingTeacher.bio_ar,
                bio_en: editingTeacher.bio_en,
                expertise_tags_ar: editingTeacher.expertise_tags_ar,
            } as any)
            .eq('id', editingTeacher.id);

        if (error) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } else {
            toast.success(t('تم الحفظ', 'Saved'));
            setEditingTeacher(null);
            fetchTeachers();
        }
    };

    // Subject actions
    const toggleSubjectVisibility = async (item: any) => {
        const newValue = !item.show_on_home;
        const { error } = await supabase
            .from('subjects')
            .update({ show_on_home: newValue })
            .eq('id', item.id);

        if (!error) {
            toast.success(newValue ? t('تم الإظهار', 'Now visible') : t('تم الإخفاء', 'Now hidden'));
            fetchFeaturedSubjects();
        }
    };

    const moveSubject = async (item: any, direction: 'up' | 'down') => {
        const currentIndex = featuredSubjects.findIndex(s => s.id === item.id);
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (newIndex < 0 || newIndex >= featuredSubjects.length) return;

        const otherItem = featuredSubjects[newIndex];

        await supabase.from('subjects').update({ home_order: newIndex }).eq('id', item.id);
        await supabase.from('subjects').update({ home_order: currentIndex }).eq('id', otherItem.id);

        fetchFeaturedSubjects();
    };

    const addFeaturedSubject = async () => {
        if (!selectedItemId) return;

        const maxOrder = featuredSubjects.length > 0
            ? Math.max(...featuredSubjects.map(s => s.home_order ?? 0)) + 1
            : 0;

        const { error } = await supabase
            .from('subjects')
            .update({ show_on_home: true, home_order: maxOrder })
            .eq('id', selectedItemId);

        if (error) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } else {
            toast.success(t('تمت الإضافة', 'Added'));
            setAddDialogOpen(false);
            setSelectedItemId('');
            fetchFeaturedSubjects();
        }
    };

    const removeFeaturedSubject = async (id: string) => {
        const { error } = await supabase
            .from('subjects')
            .update({ show_on_home: false, home_order: null })
            .eq('id', id);
        if (!error) {
            toast.success(t('تم الإزالة', 'Removed'));
            fetchFeaturedSubjects();
        }
    };

    const saveSubjectTeaser = async () => {
        if (!editingSubject) return;

        const { error } = await supabase
            .from('subjects')
            .update({
                teaser_ar: editingSubject.teaser_ar,
                teaser_en: editingSubject.teaser_en,
            })
            .eq('id', editingSubject.id);

        if (!error) {
            toast.success(t('تم الحفظ', 'Saved'));
            setEditingSubject(null);
            fetchFeaturedSubjects();
        }
    };

    // Lesson actions (similar pattern)
    const toggleLessonVisibility = async (item: any) => {
        const newValue = !item.show_on_home;
        const { error } = await supabase
            .from('lessons')
            .update({ show_on_home: newValue })
            .eq('id', item.id);

        if (!error) {
            toast.success(newValue ? t('تم الإظهار', 'Now visible') : t('تم الإخفاء', 'Now hidden'));
            fetchFeaturedLessons();
        }
    };

    const moveLesson = async (item: any, direction: 'up' | 'down') => {
        const currentIndex = featuredLessons.findIndex(l => l.id === item.id);
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (newIndex < 0 || newIndex >= featuredLessons.length) return;

        const otherItem = featuredLessons[newIndex];

        await supabase.from('lessons').update({ home_order: newIndex }).eq('id', item.id);
        await supabase.from('lessons').update({ home_order: currentIndex }).eq('id', otherItem.id);

        fetchFeaturedLessons();
    };

    const addFeaturedLesson = async () => {
        if (!selectedItemId) return;

        const maxOrder = featuredLessons.length > 0
            ? Math.max(...featuredLessons.map(l => l.home_order ?? 0)) + 1
            : 0;

        const { error } = await supabase
            .from('lessons')
            .update({ show_on_home: true, home_order: maxOrder })
            .eq('id', selectedItemId);

        if (error) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } else {
            toast.success(t('تمت الإضافة', 'Added'));
            setAddDialogOpen(false);
            setSelectedItemId('');
            fetchFeaturedLessons();
        }
    };

    const removeFeaturedLesson = async (id: string) => {
        const { error } = await supabase
            .from('lessons')
            .update({ show_on_home: false, home_order: null })
            .eq('id', id);
        if (!error) {
            toast.success(t('تم الإزالة', 'Removed'));
            fetchFeaturedLessons();
        }
    };

    const saveLessonTeaser = async () => {
        if (!editingLesson) return;

        const { error } = await supabase
            .from('lessons')
            .update({
                teaser_ar: editingLesson.teaser_ar,
                teaser_en: editingLesson.teaser_en,
            })
            .eq('id', editingLesson.id);

        if (!error) {
            toast.success(t('تم الحفظ', 'Saved'));
            setEditingLesson(null);
            fetchFeaturedLessons();
        }
    };

    const tabs = [
        { id: 'stages' as TabType, icon: Layers, label: { ar: 'المراحل', en: 'Stages' } },
        { id: 'teachers' as TabType, icon: User, label: { ar: 'المعلمون', en: 'Teachers' } },
        { id: 'subjects' as TabType, icon: BookOpen, label: { ar: 'المواد', en: 'Subjects' } },
        { id: 'lessons' as TabType, icon: FileText, label: { ar: 'الدروس', en: 'Lessons' } },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('إدارة الصفحة الرئيسية', 'Homepage Management')}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {t('تحكم بالمحتوى المعروض في الصفحة الرئيسية', 'Control the content displayed on the homepage')}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors
                            ${activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                            }
                        `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {t(tab.label.ar, tab.label.en)}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Stages Tab */}
                    {activeTab === 'stages' && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {t('فعّل الظهور للمراحل التي تريد عرضها في الصفحة الرئيسية',
                                    'Enable visibility for stages you want to show on the homepage')}
                            </p>
                            <div className="bg-background border border-border rounded-lg divide-y divide-border">
                                {stages.map((stage, index) => (
                                    <div key={stage.id} className="flex items-center gap-4 p-4">
                                        {/* Reorder */}
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => moveStage(stage, 'up')}
                                                disabled={index === 0}
                                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => moveStage(stage, 'down')}
                                                disabled={index === stages.length - 1}
                                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Icon */}
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Layers className="w-5 h-5 text-primary" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1">
                                            <p className="font-medium">{t(stage.title_ar, stage.title_en || stage.title_ar)}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                                                {t(stage.teaser_ar || stage.description_ar || '', stage.teaser_en || stage.description_en || '')}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <Button variant="ghost" size="sm" onClick={() => setEditingStage(stage)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <div className="flex items-center gap-2">
                                            {stage.show_on_home ? (
                                                <Eye className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                                            )}
                                            <Switch
                                                checked={stage.show_on_home || false}
                                                onCheckedChange={() => toggleStageVisibility(stage)}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {stages.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">
                                        {t('لا توجد مراحل', 'No stages')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Teachers Tab */}
                    {activeTab === 'teachers' && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {t('فعّل الظهور للمعلمين الذين تريد عرضهم في الصفحة الرئيسية',
                                    'Enable visibility for teachers you want to show on the homepage')}
                            </p>
                            <div className="bg-background border border-border rounded-lg divide-y divide-border">
                                {teachers.map((teacher, index) => (
                                    <div key={teacher.id} className="flex items-center gap-4 p-4">
                                        {/* Reorder */}
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => moveTeacher(teacher, 'up')}
                                                disabled={index === 0}
                                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => moveTeacher(teacher, 'down')}
                                                disabled={index === teachers.length - 1}
                                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                            {teacher.avatar_url ? (
                                                <img src={teacher.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1">
                                            <p className="font-medium">{teacher.full_name}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                                                {teacher.bio_ar || t('لا يوجد وصف', 'No bio')}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <Button variant="ghost" size="sm" onClick={() => setEditingTeacher(teacher)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <div className="flex items-center gap-2">
                                            {teacher.show_on_home ? (
                                                <Eye className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                                            )}
                                            <Switch
                                                checked={teacher.show_on_home || false}
                                                onCheckedChange={() => toggleTeacherVisibility(teacher)}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {teachers.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">
                                        {t('لا يوجد معلمون', 'No teachers')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Subjects Tab */}
                    {activeTab === 'subjects' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    {t('أضف المواد التي تريد عرضها في الصفحة الرئيسية',
                                        'Add subjects you want to show on the homepage')}
                                </p>
                                <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                                    <Plus className="w-4 h-4 me-2" />
                                    {t('إضافة مادة', 'Add Subject')}
                                </Button>
                            </div>
                            <div className="bg-background border border-border rounded-lg divide-y divide-border">
                                {featuredSubjects.map((item, index) => (
                                    <div key={item.id} className="flex items-center gap-4 p-4">
                                        {/* Reorder */}
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => moveSubject(item, 'up')}
                                                disabled={index === 0}
                                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => moveSubject(item, 'down')}
                                                disabled={index === featuredSubjects.length - 1}
                                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Icon */}
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <BookOpen className="w-5 h-5 text-primary" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1">
                                            <p className="font-medium">{item.title_ar}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.stage?.title_ar} • {item.teaser_ar || t('لا يوجد وصف', 'No teaser')}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <Button variant="ghost" size="sm" onClick={() => setEditingSubject(item)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => removeFeaturedSubject(item.id)}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                        <div className="flex items-center gap-2">
                                            {item.show_on_home ? (
                                                <Eye className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                                            )}
                                            <Switch
                                                checked={item.show_on_home || false}
                                                onCheckedChange={() => toggleSubjectVisibility(item)}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {featuredSubjects.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">
                                        {t('لم تتم إضافة مواد بعد', 'No subjects added yet')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Lessons Tab */}
                    {activeTab === 'lessons' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    {t('أضف الدروس التي تريد عرضها في الصفحة الرئيسية',
                                        'Add lessons you want to show on the homepage')}
                                </p>
                                <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                                    <Plus className="w-4 h-4 me-2" />
                                    {t('إضافة درس', 'Add Lesson')}
                                </Button>
                            </div>
                            <div className="bg-background border border-border rounded-lg divide-y divide-border">
                                {featuredLessons.map((item, index) => (
                                    <div key={item.id} className="flex items-center gap-4 p-4">
                                        {/* Reorder */}
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => moveLesson(item, 'up')}
                                                disabled={index === 0}
                                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => moveLesson(item, 'down')}
                                                disabled={index === featuredLessons.length - 1}
                                                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Icon */}
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1">
                                            <p className="font-medium">{item.title_ar}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.subject?.title_ar} • {item.teaser_ar || t('لا يوجد وصف', 'No teaser')}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <Button variant="ghost" size="sm" onClick={() => setEditingLesson(item)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => removeFeaturedLesson(item.id)}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                        <div className="flex items-center gap-2">
                                            {item.show_on_home ? (
                                                <Eye className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                                            )}
                                            <Switch
                                                checked={item.show_on_home || false}
                                                onCheckedChange={() => toggleLessonVisibility(item)}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {featuredLessons.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">
                                        {t('لم تتم إضافة دروس بعد', 'No lessons added yet')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Edit Stage Dialog */}
            <Dialog open={!!editingStage} onOpenChange={() => setEditingStage(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('تعديل بيانات المرحلة', 'Edit Stage Info')}</DialogTitle>
                    </DialogHeader>
                    {editingStage && (
                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="text-sm font-medium">{t('الوصف المختصر (عربي)', 'Teaser (Arabic)')}</label>
                                <Textarea
                                    value={editingStage.teaser_ar || ''}
                                    onChange={(e) => setEditingStage({ ...editingStage, teaser_ar: e.target.value })}
                                    rows={2}
                                    placeholder={t('وصف مختصر للصفحة الرئيسية', 'Short description for homepage')}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">{t('الوصف المختصر (إنجليزي)', 'Teaser (English)')}</label>
                                <Textarea
                                    value={editingStage.teaser_en || ''}
                                    onChange={(e) => setEditingStage({ ...editingStage, teaser_en: e.target.value })}
                                    rows={2}
                                    placeholder={t('وصف مختصر للصفحة الرئيسية', 'Short description for homepage')}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setEditingStage(null)}>
                                    {t('إلغاء', 'Cancel')}
                                </Button>
                                <Button onClick={saveStage}>
                                    <Save className="w-4 h-4 me-2" />
                                    {t('حفظ', 'Save')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Teacher Dialog */}
            <Dialog open={!!editingTeacher} onOpenChange={() => setEditingTeacher(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('تعديل بيانات المعلم', 'Edit Teacher Info')}</DialogTitle>
                    </DialogHeader>
                    {editingTeacher && (
                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="text-sm font-medium">{t('الوصف (عربي)', 'Bio (Arabic)')}</label>
                                <Textarea
                                    value={editingTeacher.bio_ar || ''}
                                    onChange={(e) => setEditingTeacher({ ...editingTeacher, bio_ar: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">{t('الوصف (إنجليزي)', 'Bio (English)')}</label>
                                <Textarea
                                    value={editingTeacher.bio_en || ''}
                                    onChange={(e) => setEditingTeacher({ ...editingTeacher, bio_en: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">{t('التخصصات (مفصولة بفاصلة)', 'Expertise (comma-separated)')}</label>
                                <Input
                                    value={(editingTeacher.expertise_tags_ar || []).join(', ')}
                                    onChange={(e) => setEditingTeacher({
                                        ...editingTeacher,
                                        expertise_tags_ar: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                    })}
                                    placeholder="الرياضيات, العلوم, الفيزياء"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setEditingTeacher(null)}>
                                    {t('إلغاء', 'Cancel')}
                                </Button>
                                <Button onClick={saveTeacher}>
                                    <Save className="w-4 h-4 me-2" />
                                    {t('حفظ', 'Save')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Subject Teaser Dialog */}
            <Dialog open={!!editingSubject} onOpenChange={() => setEditingSubject(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('تعديل وصف المادة', 'Edit Subject Teaser')}</DialogTitle>
                    </DialogHeader>
                    {editingSubject && (
                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="text-sm font-medium">{t('الوصف (عربي)', 'Teaser (Arabic)')}</label>
                                <Textarea
                                    value={editingSubject.teaser_ar || ''}
                                    onChange={(e) => setEditingSubject({ ...editingSubject, teaser_ar: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">{t('الوصف (إنجليزي)', 'Teaser (English)')}</label>
                                <Textarea
                                    value={editingSubject.teaser_en || ''}
                                    onChange={(e) => setEditingSubject({ ...editingSubject, teaser_en: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setEditingSubject(null)}>
                                    {t('إلغاء', 'Cancel')}
                                </Button>
                                <Button onClick={saveSubjectTeaser}>
                                    <Save className="w-4 h-4 me-2" />
                                    {t('حفظ', 'Save')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Lesson Teaser Dialog */}
            <Dialog open={!!editingLesson} onOpenChange={() => setEditingLesson(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('تعديل وصف الدرس', 'Edit Lesson Teaser')}</DialogTitle>
                    </DialogHeader>
                    {editingLesson && (
                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="text-sm font-medium">{t('الوصف (عربي)', 'Teaser (Arabic)')}</label>
                                <Textarea
                                    value={editingLesson.teaser_ar || ''}
                                    onChange={(e) => setEditingLesson({ ...editingLesson, teaser_ar: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">{t('الوصف (إنجليزي)', 'Teaser (English)')}</label>
                                <Textarea
                                    value={editingLesson.teaser_en || ''}
                                    onChange={(e) => setEditingLesson({ ...editingLesson, teaser_en: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setEditingLesson(null)}>
                                    {t('إلغاء', 'Cancel')}
                                </Button>
                                <Button onClick={saveLessonTeaser}>
                                    <Save className="w-4 h-4 me-2" />
                                    {t('حفظ', 'Save')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add Subject/Lesson Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {activeTab === 'subjects'
                                ? t('إضافة مادة', 'Add Subject')
                                : t('إضافة درس', 'Add Lesson')
                            }
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <label className="text-sm font-medium">
                                {activeTab === 'subjects'
                                    ? t('اختر المادة', 'Select Subject')
                                    : t('اختر الدرس', 'Select Lesson')
                                }
                            </label>
                            <select
                                className="w-full mt-1 p-2 border border-border rounded-md bg-background"
                                value={selectedItemId}
                                onChange={(e) => setSelectedItemId(e.target.value)}
                            >
                                <option value="">{t('اختر...', 'Select...')}</option>
                                {activeTab === 'subjects' && allSubjects.map(subject => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.title_ar} - {(subject as any).stage?.title_ar}
                                    </option>
                                ))}
                                {activeTab === 'lessons' && allLessons.map(lesson => (
                                    <option key={lesson.id} value={lesson.id}>
                                        {lesson.title_ar} - {(lesson as any).subject?.title_ar}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button onClick={activeTab === 'subjects' ? addFeaturedSubject : addFeaturedLesson}>
                                <Plus className="w-4 h-4 me-2" />
                                {t('إضافة', 'Add')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
