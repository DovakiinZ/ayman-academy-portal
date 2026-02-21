import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/layout/Layout';
import {
    Search,
    Filter,
    X,
    Loader2,
    Play,
    Lock,
    Clock,
    User,
    BookOpen,
    ArrowLeft,
    ArrowRight,
    ChevronDown,
    Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Lesson, Stage, Profile } from '@/types/database';

export default function Lessons() {
    const { t, direction } = useLanguage();
    const [lessons, setLessons] = useState<any[]>([]); // Using any[] for complex join results
    const [stages, setStages] = useState<Stage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStage, setSelectedStage] = useState<string>('all');
    const [selectedTag, setSelectedTag] = useState<string>('all');
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Fetch stages
            const { data: stagesData } = await supabase
                .from('stages')
                .select('*')
                .order('sort_order', { ascending: true });
            setStages(stagesData || []);

            // Fetch teachers to extract expertise tags
            const { data: teachersData } = await supabase
                .from('profiles')
                .select('expertise_tags_ar')
                .eq('role', 'teacher')
                .eq('is_active', true);

            if (teachersData) {
                const tags = new Set<string>();
                (teachersData as any[]).forEach(teacher => {
                    if (teacher.expertise_tags_ar && Array.isArray(teacher.expertise_tags_ar)) {
                        teacher.expertise_tags_ar.forEach((tag: string) => tags.add(tag));
                    }
                });
                setAvailableTags(Array.from(tags).sort());
            }

            await fetchLessons();
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLessons = async () => {
        let query = supabase
            .from('lessons')
            .select(`
        *,
        subject:subjects(
          id,
          title_ar,
          title_en,
          stage:stages(id, title_ar, title_en)
        ),
        teacher:profiles!created_by(
          id,
          full_name,
          expertise_tags_ar,
          featured_stages
        )
      `)
            .eq('is_published', true);

        if (selectedStage !== 'all') {
            // Use related table filtering for stage
            // Note: This requires a nested filter which can be tricky in Supabase
            // Alternative: Filter in memory or use a more specific query
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        const lessonsData = data as any[];

        if (!error && lessonsData) {
            // In-memory filtering for more complex logic (tags/stages)
            let filtered = lessonsData;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                filtered = filtered.filter(l =>
                    l.title_ar.toLowerCase().includes(q) ||
                    (l.title_en && l.title_en.toLowerCase().includes(q))
                );
            }

            if (selectedStage !== 'all') {
                filtered = filtered.filter(l => l.subject?.stage?.id === selectedStage);
            }

            if (selectedTag !== 'all') {
                filtered = filtered.filter(l =>
                    l.teacher?.expertise_tags_ar &&
                    Array.isArray(l.teacher.expertise_tags_ar) &&
                    l.teacher.expertise_tags_ar.includes(selectedTag)
                );
            }

            setLessons(filtered);
        }
    };

    useEffect(() => {
        fetchLessons();
    }, [searchQuery, selectedStage, selectedTag]);

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedStage('all');
        setSelectedTag('all');
    };

    const hasActiveFilters = searchQuery !== '' || selectedStage !== 'all' || selectedTag !== 'all';

    return (
        <Layout>
            {/* Header */}
            <section className="bg-secondary/30 py-10 border-b border-border">
                <div className="container-academic">
                    <h1 className="text-3xl font-bold text-foreground mb-4">
                        {t('تصفح الدروس', 'Browse Lessons')}
                    </h1>
                    <p className="text-muted-foreground max-w-2xl">
                        {t(
                            'استكشف مكتبتنا الشاملة من الدروس التعليمية المصنفة حسب المرحلة والمادة والمعلم.',
                            'Explore our comprehensive library of educational lessons categorized by stage, subject, and teacher.'
                        )}
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <section className="section-academic min-h-[60vh]">
                <div className="container-academic">
                    {/* Controls */}
                    <div className="flex flex-col md:flex-row gap-4 mb-8">
                        <div className="relative flex-1">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={t('ابحث عن درس...', 'Search for a lesson...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="ps-9"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant={showFilters ? 'secondary' : 'outline'}
                                onClick={() => setShowFilters(!showFilters)}
                                className="gap-2"
                            >
                                <Filter className="w-4 h-4" />
                                {t('فلاتر', 'Filters')}
                                {hasActiveFilters && (
                                    <Badge variant="destructive" className="ms-1 h-2 w-2 p-0 rounded-full" />
                                )}
                            </Button>
                            {hasActiveFilters && (
                                <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
                                    <X className="w-4 h-4 me-2" />
                                    {t('مسح الكل', 'Clear All')}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Expanded Filters */}
                    <div className={cn(
                        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 overflow-hidden transition-all duration-300",
                        showFilters ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    )}>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ms-1">
                                {t('المرحلة الدراسية', 'Educational Stage')}
                            </label>
                            <Select value={selectedStage} onValueChange={setSelectedStage}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('كل المراحل', 'All Stages')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('كل المراحل', 'All Stages')}</SelectItem>
                                    {stages.map(stage => (
                                        <SelectItem key={stage.id} value={stage.id}>
                                            {t(stage.title_ar, stage.title_en || stage.title_ar)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ms-1">
                                {t('تخصص المعلم', 'Teacher Expertise')}
                            </label>
                            <Select value={selectedTag} onValueChange={setSelectedTag}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('كل التخصصات', 'All Specializations')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('كل التخصصات', 'All Specializations')}</SelectItem>
                                    {availableTags.map(tag => (
                                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Results */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground">{t('جاري تحميل الدروس...', 'Loading lessons...')}</p>
                        </div>
                    ) : lessons.length === 0 ? (
                        <div className="text-center py-20 bg-secondary/10 rounded-xl border border-dashed border-border">
                            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-xl font-semibold mb-2">{t('لم يتم العثور على دروس', 'No lessons found')}</h3>
                            <p className="text-muted-foreground mb-6">
                                {t('جرّب تغيير كلمات البحث أو الفلاتر المختارة', 'Try changing your search terms or selected filters')}
                            </p>
                            <Button onClick={clearFilters} variant="outline">{t('إعادة تعيين الفلاتر', 'Reset Filters')}</Button>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {lessons.map((lesson) => (
                                <Link
                                    key={lesson.id}
                                    to={`/lesson/${lesson.id}`}
                                    className="academic-card p-0 overflow-hidden group hover:shadow-lg transition-all border border-border flex flex-col h-full"
                                >
                                    <div className="relative aspect-video bg-secondary overflow-hidden">
                                        <img
                                            src={lesson.cover_image_url || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=225&fit=crop'}
                                            alt={t(lesson.title_ar, lesson.title_en)}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                                <Play className="w-5 h-5 text-primary fill-current ms-1" />
                                            </div>
                                        </div>
                                        {!lesson.is_paid && (
                                            <div className="absolute top-2 start-2">
                                                <Badge className="bg-green-500 text-white border-none shadow-sm">{t('مجاني', 'Free')}</Badge>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="text-[10px] font-normal px-2 py-0">
                                                {t(lesson.subject?.stage?.title_ar, lesson.subject?.stage?.title_en || lesson.subject?.stage?.title_ar)}
                                            </Badge>
                                            <span className="text-[10px] text-primary font-medium">
                                                {t(lesson.subject?.title_ar, lesson.subject?.title_en || lesson.subject?.title_ar)}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-foreground mb-2 line-clamp-2 leading-tight">
                                            {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                        </h3>

                                        {lesson.summary_ar && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                                                {t(lesson.summary_ar, lesson.summary_en || lesson.summary_ar)}
                                            </p>
                                        )}

                                        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center border border-border overflow-hidden">
                                                    {lesson.teacher?.avatar_url ? (
                                                        <img src={lesson.teacher.avatar_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-4 h-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <span className="text-xs font-medium text-foreground truncate max-w-[100px]">
                                                    {lesson.teacher?.full_name || t('معلم', 'Instructor')}
                                                </span>
                                            </div>

                                            {lesson.duration_seconds && (
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    <Clock className="w-3 h-3" />
                                                    {Math.floor(lesson.duration_seconds / 60)}{t(' دقيقة', 'm')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
}
