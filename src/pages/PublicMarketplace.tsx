/**
 * PublicMarketplace — Udemy-style course marketplace (public, no auth needed)
 * Layout: Left sidebar filters + Main content (hero, tabs, course grid)
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { STALE_TIMES } from '@/lib/queryConfig';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import Layout from '@/components/layout/Layout';
import {
    BookOpen, User, Clock, Search, Loader2, Play, Star,
    ChevronDown, ChevronUp, SlidersHorizontal, X, GraduationCap,
} from 'lucide-react';

const GRADIENTS = [
    'from-violet-600/80 to-indigo-900/80',
    'from-emerald-600/80 to-teal-900/80',
    'from-amber-600/80 to-orange-900/80',
    'from-rose-600/80 to-pink-900/80',
    'from-cyan-600/80 to-blue-900/80',
    'from-fuchsia-600/80 to-purple-900/80',
];

export default function PublicMarketplace() {
    const { t, language, direction } = useLanguage();
    const { isAuthenticated, role } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [stageFilter, setStageFilter] = useState<string>('all');
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [categoriesExpanded, setCategoriesExpanded] = useState(true);

    const formatPrice = (amount?: number | null, currency?: string | null) => {
        if (!amount || amount === 0) return t('مجاني', 'Free');
        return `${amount.toLocaleString()} ${currency || 'SYP'}`;
    };

    const getCourseLink = (subjectId: string) => {
        if (isAuthenticated && role === 'student') return `/student/course/${subjectId}`;
        return `/course/${subjectId}`;
    };

    // ── Data ─────────────────────────────────────
    const { data: subjects = [], isLoading } = useQuery({
        queryKey: ['public-marketplace'],
        queryFn: async () => {
            const { data: subjectsData, error } = await supabase
                .from('subjects')
                .select('id, title_ar, title_en, description_ar, description_en, stage_id, teacher_id, cover_image_url, is_paid, price_amount, price_currency, sort_order, is_active, stage:stages(id, title_ar, title_en, slug)')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (error) throw error;

            const teacherIds = [...new Set((subjectsData || []).map(s => s.teacher_id).filter(Boolean))];
            const teacherMap = new Map();
            if (teacherIds.length > 0) {
                const { data: teachers } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', teacherIds);
                (teachers || []).forEach(t => teacherMap.set(t.id, t));
            }

            const subjectIds = (subjectsData || []).map(s => s.id);
            const lessonCountMap = new Map();
            if (subjectIds.length > 0) {
                const { data: lessons } = await supabase.from('lessons').select('subject_id, duration_minutes').in('subject_id', subjectIds).eq('is_published', true);
                (lessons || []).forEach(l => {
                    const prev = lessonCountMap.get(l.subject_id) || { count: 0, duration: 0 };
                    lessonCountMap.set(l.subject_id, { count: prev.count + 1, duration: prev.duration + (l.duration_minutes || 0) });
                });
            }

            // Ratings per subject
            // Ratings: aggregate lesson ratings per subject
            const ratingMap = new Map<string, { avg: number; count: number }>();
            if (subjectIds.length > 0) {
                // Get all lesson IDs for these subjects
                const { data: subjectLessons } = await supabase.from('lessons').select('id, subject_id').in('subject_id', subjectIds).eq('is_published', true);
                const lessonIds = (subjectLessons || []).map(l => l.id);
                const lessonToSubject = new Map((subjectLessons || []).map(l => [l.id, l.subject_id]));

                if (lessonIds.length > 0) {
                    const { data: ratings } = await supabase.from('ratings').select('entity_id, stars').eq('entity_type', 'lesson').in('entity_id', lessonIds);
                    // Also check for direct subject ratings
                    const { data: subjectRatings } = await supabase.from('ratings').select('entity_id, stars').eq('entity_type', 'subject').in('entity_id', subjectIds);

                    const grouped = new Map<string, number[]>();
                    // Aggregate lesson ratings to their subject
                    (ratings || []).forEach(r => {
                        const sid = lessonToSubject.get(r.entity_id);
                        if (sid) { const arr = grouped.get(sid) || []; arr.push(r.stars); grouped.set(sid, arr); }
                    });
                    // Add direct subject ratings
                    (subjectRatings || []).forEach(r => {
                        const arr = grouped.get(r.entity_id) || []; arr.push(r.stars); grouped.set(r.entity_id, arr);
                    });
                    grouped.forEach((stars, id) => {
                        ratingMap.set(id, { avg: Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10, count: stars.length });
                    });
                }
            }

            return (subjectsData || []).map(s => ({
                ...s,
                teacher: s.teacher_id ? teacherMap.get(s.teacher_id) : null,
                lesson_count: lessonCountMap.get(s.id)?.count || 0,
                total_duration: lessonCountMap.get(s.id)?.duration || 0,
                avg_rating: ratingMap.get(s.id)?.avg || 0,
                rating_count: ratingMap.get(s.id)?.count || 0,
            }));
        },
        staleTime: STALE_TIMES.SEMI_STATIC,
    });

    // Stage options for tabs + sidebar
    const stageOptions = useMemo(() => {
        const map = new Map<string, any>();
        subjects.forEach((s: any) => { if (s.stage && !map.has(s.stage.id)) map.set(s.stage.id, s.stage); });
        return Array.from(map.values());
    }, [subjects]);

    // Unique teacher names for category filter
    const teacherNames = useMemo(() => {
        const names = new Map<string, string>();
        subjects.forEach((s: any) => { if (s.teacher) names.set(s.teacher.id, s.teacher.full_name); });
        return Array.from(names.entries()); // [id, name]
    }, [subjects]);

    // Filtered
    const filtered = useMemo(() => {
        let list = [...subjects];
        if (stageFilter !== 'all') list = list.filter((s: any) => s.stage?.id === stageFilter);
        if (selectedCategories.size > 0) list = list.filter((s: any) => s.teacher && selectedCategories.has(s.teacher.id));
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter((s: any) => s.title_ar?.toLowerCase().includes(q) || s.title_en?.toLowerCase().includes(q) || s.teacher?.full_name?.toLowerCase().includes(q));
        }
        return list;
    }, [subjects, stageFilter, selectedCategories, searchQuery]);

    const toggleCategory = (id: string) => {
        setSelectedCategories(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // Duration formatter
    const fmtDuration = (mins: number) => {
        if (mins < 60) return `${mins}${t('د', 'm')}`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}${t('س', 'h')} ${m.toString().padStart(2, '0')}${t('د', 'm')}` : `${h}${t('س', 'h')}`;
    };

    // ── Sidebar Content ──────────────────────────
    const SidebarContent = () => (
        <div className="space-y-6">
            {/* Sidebar Search */}
            <div>
                <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('ابحث عن مادة...', 'Search Courses')}
                        className="w-full ps-9 pe-3 py-2 rounded-lg border border-border bg-secondary/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition"
                    />
                </div>
            </div>

            {/* Stages as categories */}
            {stageOptions.length > 0 && (
                <div>
                    <button
                        onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                        className="flex items-center justify-between w-full text-sm font-semibold mb-3"
                    >
                        {t('المراحل الدراسية', 'Course categories')}
                        {categoriesExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {categoriesExpanded && (
                        <div className="space-y-1">
                            {stageOptions.map((stage: any) => {
                                const count = subjects.filter((s: any) => s.stage?.id === stage.id).length;
                                const isActive = stageFilter === stage.id;
                                return (
                                    <button
                                        key={stage.id}
                                        onClick={() => setStageFilter(isActive ? 'all' : stage.id)}
                                        className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <GraduationCap className="w-3.5 h-3.5" />
                                            {language === 'ar' ? stage.title_ar : stage.title_en || stage.title_ar}
                                        </span>
                                        <span className="text-xs opacity-60">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Teachers filter */}
            {teacherNames.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold mb-3">{t('المعلمون', 'Teachers')}</h3>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {teacherNames.map(([id, name]) => (
                            <label key={id} className="flex items-center gap-2.5 cursor-pointer px-1 py-0.5 rounded hover:bg-muted/30 transition">
                                <Checkbox
                                    checked={selectedCategories.has(id)}
                                    onCheckedChange={() => toggleCategory(id)}
                                />
                                <span className="text-sm text-muted-foreground">{name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Clear filters */}
            {(stageFilter !== 'all' || selectedCategories.size > 0 || searchQuery) && (
                <button
                    onClick={() => { setStageFilter('all'); setSelectedCategories(new Set()); setSearchQuery(''); }}
                    className="text-xs text-destructive hover:underline flex items-center gap-1"
                >
                    <X className="w-3 h-3" />
                    {t('مسح الفلاتر', 'Clear filters')}
                </button>
            )}
        </div>
    );

    return (
        <Layout>
            <div dir={direction} className="min-h-screen">
                <div className="max-w-[1400px] mx-auto px-4 py-6">
                    {/* Mobile filter toggle */}
                    <div className="lg:hidden mb-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                            className="gap-2"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            {t('الفلاتر', 'Filters')}
                        </Button>
                    </div>

                    <div className="flex gap-6">
                        {/* ── LEFT SIDEBAR ─────────────── */}
                        {/* Desktop sidebar */}
                        <aside className="hidden lg:block w-64 flex-shrink-0">
                            <div className="sticky top-20 bg-background border border-border rounded-xl p-5">
                                <SidebarContent />
                            </div>
                        </aside>

                        {/* Mobile sidebar overlay */}
                        {mobileSidebarOpen && (
                            <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileSidebarOpen(false)}>
                                <div className="absolute top-0 start-0 bottom-0 w-72 bg-background p-5 overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="font-semibold">{t('الفلاتر', 'Filters')}</h2>
                                        <button onClick={() => setMobileSidebarOpen(false)}><X className="w-5 h-5" /></button>
                                    </div>
                                    <SidebarContent />
                                </div>
                            </div>
                        )}

                        {/* ── MAIN CONTENT ─────────────── */}
                        <main className="flex-1 min-w-0">
                            {/* Hero Banner */}
                            <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-primary/90 via-primary to-violet-700 p-8 md:p-10">
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%221%22%20cy%3D%221%22%20r%3D%221%22%20fill%3D%22rgba(255%2C255%2C255%2C0.05)%22%2F%3E%3C%2Fsvg%3E')] opacity-50" />
                                <div className="relative z-10 max-w-lg">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                                        {t('اختر المادة المناسبة لمستواك', 'The right choice of course')}
                                    </h2>
                                    <p className="text-white/70 text-sm mb-5">
                                        {t(
                                            'تصفح المواد الدراسية المتاحة واشترك في ما يناسبك مع أفضل المعلمين',
                                            'Browse available courses and enroll with the best teachers'
                                        )}
                                    </p>
                                    <Link to={isAuthenticated ? '/student/marketplace' : '/register'}>
                                        <Button variant="secondary" size="sm" className="rounded-full px-6">
                                            {t('استكشف المزيد', 'Explore more')}
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Stage Tabs */}
                            <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
                                <button
                                    onClick={() => setStageFilter('all')}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${stageFilter === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'}`}
                                >
                                    {t('الكل', 'All')}
                                </button>
                                {stageOptions.map((stage: any) => (
                                    <button
                                        key={stage.id}
                                        onClick={() => setStageFilter(stage.id)}
                                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${stageFilter === stage.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'}`}
                                    >
                                        {language === 'ar' ? stage.title_ar : stage.title_en || stage.title_ar}
                                    </button>
                                ))}
                            </div>

                            {/* Section Header */}
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-semibold">
                                    {t('المواد المتاحة', 'Recommended courses for you')}
                                </h3>
                                <span className="text-sm text-muted-foreground">
                                    {filtered.length} {t('مادة', 'courses')}
                                </span>
                            </div>

                            {/* Loading */}
                            {isLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="text-center py-20 bg-secondary/30 rounded-xl">
                                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                                    <p className="text-muted-foreground">
                                        {searchQuery ? t('لا توجد نتائج', 'No results') : t('لا توجد مواد متاحة حالياً', 'No courses available yet')}
                                    </p>
                                </div>
                            ) : (
                                /* ── COURSE GRID ── */
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {filtered.map((subject: any, idx: number) => {
                                        const isFree = !subject.price_amount || subject.price_amount === 0;
                                        const gradient = GRADIENTS[idx % GRADIENTS.length];
                                        const hasCover = !!subject.cover_image_url;

                                        return (
                                            <div key={subject.id} className="group bg-background border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                                                {/* Thumbnail */}
                                                <Link to={getCourseLink(subject.id)} className="block relative aspect-[16/9] overflow-hidden">
                                                    {hasCover ? (
                                                        <img src={subject.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                                                            <BookOpen className="w-10 h-10 text-white/25" />
                                                        </div>
                                                    )}
                                                    {/* Play overlay */}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                        <div className="w-11 h-11 rounded-full bg-white/0 group-hover:bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                                            <Play className="w-5 h-5 text-white ms-0.5" />
                                                        </div>
                                                    </div>
                                                    {/* Stage badge */}
                                                    {subject.stage && (
                                                        <span className="absolute top-2.5 start-2.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded">
                                                            {language === 'ar' ? subject.stage.title_ar : subject.stage.title_en || subject.stage.title_ar}
                                                        </span>
                                                    )}
                                                </Link>

                                                {/* Content */}
                                                <div className="p-4">
                                                    {/* Title */}
                                                    <Link to={getCourseLink(subject.id)}>
                                                        <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                                                            {t(subject.title_ar, subject.title_en || subject.title_ar)}
                                                        </h3>
                                                    </Link>

                                                    {/* Teacher */}
                                                    {subject.teacher && (
                                                        <p className="text-xs text-muted-foreground mb-2.5 truncate">
                                                            {subject.teacher.full_name}
                                                        </p>
                                                    )}

                                                    {/* Meta row: lessons · duration */}
                                                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
                                                        <span className="flex items-center gap-1">
                                                            <BookOpen className="w-3 h-3" />
                                                            {subject.lesson_count}
                                                        </span>
                                                        {subject.total_duration > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {fmtDuration(subject.total_duration)}
                                                            </span>
                                                        )}
                                                        {subject.avg_rating > 0 && (
                                                            <span className="flex items-center gap-1 text-amber-500">
                                                                <Star className="w-3 h-3 fill-amber-500" />
                                                                {subject.avg_rating}
                                                                <span className="text-muted-foreground">({subject.rating_count})</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Price + Enroll */}
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-lg font-bold ${isFree ? 'text-green-500' : ''}`}>
                                                            {formatPrice(subject.price_amount, subject.price_currency)}
                                                        </span>
                                                        <Link to={isAuthenticated && role === 'student' ? '/student/marketplace' : '/register'}>
                                                            <Button size="sm" variant="secondary" className="text-xs h-7 rounded-full px-4">
                                                                {t('سجّل الآن', 'Enrol now')}
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* CTA for non-authenticated */}
                            {!isAuthenticated && filtered.length > 0 && (
                                <div className="text-center mt-10 p-8 bg-primary/5 rounded-2xl border border-primary/10">
                                    <h2 className="text-xl font-bold mb-2">
                                        {t('جاهز لبدء التعلم؟', 'Ready to Start Learning?')}
                                    </h2>
                                    <p className="text-muted-foreground text-sm mb-4">
                                        {t('أنشئ حسابك المجاني وابدأ بالتسجيل في المواد', 'Create your free account and start enrolling')}
                                    </p>
                                    <div className="flex gap-3 justify-center">
                                        <Button asChild><Link to="/register">{t('إنشاء حساب', 'Create Account')}</Link></Button>
                                        <Button variant="outline" asChild><Link to="/login">{t('تسجيل الدخول', 'Sign In')}</Link></Button>
                                    </div>
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
