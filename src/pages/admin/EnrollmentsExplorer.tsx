import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import {
    Loader2, Search, Filter, X, ChevronRight, Download,
    User, BookOpen, GraduationCap, ClipboardList, Info,
    UserCircle, BookMarked, Layers, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface Stage {
    id: string;
    title_ar: string;
    title_en?: string | null;
}

interface EnrollmentRecord {
    id: string;
    full_name?: string;
    email?: string;
    title_ar?: string;
    title_en?: string;
    student_count?: number;
    lesson_count?: number;
    avg_progress?: number;
    stage_title?: string;
    subject_count?: number;
    last_activity?: string;
    created_at?: string;
}

interface DetailRecord {
    id: string;
    full_name?: string;
    email?: string;
    progress_percent?: number;
    last_activity?: string;
    title_ar?: string;
    stage_title?: string;
    subjects_count?: number;
    completed_lessons?: number;
    total_lessons?: number;
}

export default function EnrollmentsExplorer() {
    const { t, language, direction } = useLanguage();
    const [activeTab, setActiveTab] = useState('subject');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<EnrollmentRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [stages, setStages] = useState<Stage[]>([]);

    // Filters
    const [search, setSearch] = useState('');
    const [stageId, setStageId] = useState<string>('all');
    const [page, setPage] = useState(1);
    const limit = 15;

    // Detail Drawer
    const [selectedItem, setSelectedItem] = useState<EnrollmentRecord | null>(null);
    const [detailData, setDetailData] = useState<DetailRecord[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        fetchStages();
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        fetchData();
    }, [activeTab, search, stageId, page]);

    const fetchStages = async () => {
        const { data } = await supabase.from('stages').select('id, title_ar, title_en').order('sort_order');
        if (mountedRef.current && data) setStages(data);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: res, error } = await supabase.rpc('get_admin_enrollments', {
                p_view: activeTab,
                p_search: search,
                p_stage_id: stageId === 'all' ? null : stageId,
                p_page: page,
                p_limit: limit
            });

            if (error) throw error;
            if (mountedRef.current) {
                setData(res.data || []);
                setTotal(res.total || 0);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error(t('فشل في تحميل البيانات', 'Failed to load data'));
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const fetchDetails = async (item: EnrollmentRecord) => {
        setSelectedItem(item);
        setDetailLoading(true);
        try {
            const { data: res, error } = await supabase.rpc('get_admin_enrollment_detail', {
                p_view: activeTab,
                p_id: item.id
            });

            if (error) throw error;
            if (mountedRef.current) setDetailData(res || []);
        } catch (err) {
            console.error('Detail fetch error:', err);
            toast.error(t('فشل في تحميل التفاصيل', 'Failed to load details'));
        } finally {
            if (mountedRef.current) setDetailLoading(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        try {
            return format(new Date(dateStr), 'PPp', {
                locale: language === 'ar' ? ar : enUS
            });
        } catch {
            return dateStr;
        }
    };

    const renderTable = () => {
        if (loading) {
            return (
                <div className="p-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-muted-foreground">{t('جاري التحميل...', 'Loading...')}</p>
                </div>
            );
        }

        if (data.length === 0) {
            return (
                <div className="p-20 text-center border rounded-lg bg-muted/10">
                    <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">{t('لا توجد تسجيلات', 'No enrollments found')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t('حاول تغيير الفلاتر أو البحث', 'Try changing the filters or search query')}</p>
                </div>
            );
        }

        return (
            <div className="border rounded-md bg-background">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {activeTab === 'teacher' && (
                                <>
                                    <TableHead>{t('المعلم', 'Teacher')}</TableHead>
                                    <TableHead>{t('عدد الطلاب', 'Students')}</TableHead>
                                    <TableHead>{t('عدد الدروس', 'Lessons')}</TableHead>
                                </>
                            )}
                            {activeTab === 'subject' && (
                                <>
                                    <TableHead>{t('المادة', 'Subject')}</TableHead>
                                    <TableHead>{t('المرحلة', 'Stage')}</TableHead>
                                    <TableHead>{t('عدد الطلاب', 'Students')}</TableHead>
                                    <TableHead>{t('متوسط الإنجاز', 'Avg. Progress')}</TableHead>
                                </>
                            )}
                            {activeTab === 'course' && (
                                <>
                                    <TableHead>{t('الدورة', 'Course')}</TableHead>
                                    <TableHead>{t('عدد المشتركين', 'Enrollments')}</TableHead>
                                </>
                            )}
                            {activeTab === 'student' && (
                                <>
                                    <TableHead>{t('الطالب', 'Student')}</TableHead>
                                    <TableHead>{t('عدد المواد', 'Subjects')}</TableHead>
                                    <TableHead>{t('آخر نشاط', 'Last Activity')}</TableHead>
                                </>
                            )}
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow
                                key={item.id}
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => fetchDetails(item)}
                            >
                                {activeTab === 'teacher' && (
                                    <>
                                        <TableCell>
                                            <div className="font-medium">{item.full_name}</div>
                                            <div className="text-xs text-muted-foreground">{item.email}</div>
                                        </TableCell>
                                        <TableCell><Badge variant="secondary">{item.student_count}</Badge></TableCell>
                                        <TableCell>{item.lesson_count}</TableCell>
                                    </>
                                )}
                                {activeTab === 'subject' && (
                                    <>
                                        <TableCell>
                                            <div className="font-medium">{t(item.title_ar || '', item.title_en || item.title_ar || '')}</div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{item.stage_title}</Badge></TableCell>
                                        <TableCell><Badge variant="secondary">{item.student_count}</Badge></TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary" style={{ width: `${item.avg_progress}%` }} />
                                                </div>
                                                <span className="text-xs font-medium">{Math.round(item.avg_progress || 0)}%</span>
                                            </div>
                                        </TableCell>
                                    </>
                                )}
                                {activeTab === 'course' && (
                                    <>
                                        <TableCell>
                                            <div className="font-medium">{t(item.title_ar || '', item.title_en || item.title_ar || '')}</div>
                                        </TableCell>
                                        <TableCell><Badge variant="secondary">{item.student_count}</Badge></TableCell>
                                    </>
                                )}
                                {activeTab === 'student' && (
                                    <>
                                        <TableCell>
                                            <div className="font-medium">{item.full_name}</div>
                                            <div className="text-xs text-muted-foreground">{item.email}</div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{item.subject_count}</Badge></TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{formatDate(item.last_activity)}</TableCell>
                                    </>
                                )}
                                <TableCell>
                                    <Button variant="ghost" size="icon">
                                        <ChevronRight className={`w-4 h-4 text-muted-foreground ${direction === 'rtl' ? 'rotate-180' : ''}`} />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">{t('مستكشف التسجيلات', 'Enrollments Explorer')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('متابعة مشاركة الطلاب وتقدمهم عبر المنصة', 'Track student participation and progress across the platform')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <Loader2 className={`w-4 h-4 me-2 ${loading ? 'animate-spin' : ''}`} />
                        {t('تحديث', 'Refresh')}
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 me-2" />
                        {t('تصدير', 'Export')}
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }} className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-muted/50">
                    <TabsTrigger value="teacher" className="gap-2">
                        <UserCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('المعلمون', 'Teachers')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="subject" className="gap-2">
                        <BookMarked className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('المواد', 'Subjects')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="course" className="gap-2">
                        <Layers className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('الدورات', 'Courses')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="student" className="gap-2">
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('الطلاب', 'Students')}</span>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-1">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={t('بحث بالاسم أو الإيميل...', 'Search by name or email...')}
                        className="ps-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={stageId} onValueChange={setStageId}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('كل المراحل', 'All Stages')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('كل المراحل', 'All Stages')}</SelectItem>
                        {stages.map(s => (
                            <SelectItem key={s.id} value={s.id}>{t(s.title_ar, s.title_en || s.title_ar)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="min-h-[400px]">
                {renderTable()}
            </div>

            {/* Pagination Placeholder */}
            {total > limit && (
                <div className="flex items-center justify-between py-4">
                    <p className="text-sm text-muted-foreground">
                        {t(`عرض ${(page - 1) * limit + 1} إلى ${Math.min(page * limit, total)} من أصل ${total}`, `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, total)} of ${total}`)}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>{t('السابق', 'Previous')}</Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}>{t('التالي', 'Next')}</Button>
                    </div>
                </div>
            )}

            {/* Drilldown Drawer */}
            <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <SheetContent side={direction === 'rtl' ? 'left' : 'right'} className="sm:max-w-xl">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="text-xl font-bold flex items-center gap-3">
                            {activeTab === 'teacher' && <UserCircle className="w-5 h-5 text-primary" />}
                            {activeTab === 'subject' && <BookMarked className="w-5 h-5 text-primary" />}
                            {activeTab === 'course' && <Layers className="w-5 h-5 text-primary" />}
                            {activeTab === 'student' && <User className="w-5 h-5 text-primary" />}
                            {selectedItem?.full_name || t(selectedItem?.title_ar || '', selectedItem?.title_en || selectedItem?.title_ar || '')}
                        </SheetTitle>
                        <SheetDescription>
                            {activeTab === 'teacher' && t('قائمة الطلاب المسجلين في دروس هذا المعلم', 'List of students enrolled in this teacher\'s lessons')}
                            {activeTab === 'subject' && t('متابعة تقدم الطلاب في هذه المادة', 'Track student progress in this subject')}
                            {activeTab === 'course' && t('المشتركون في هذه الدورة', 'Enrolled users in this course')}
                            {activeTab === 'student' && t('المواد التي يدرسها هذا الطالب', 'Subjects this student is studying')}
                        </SheetDescription>
                    </SheetHeader>

                    <ScrollArea className="h-[calc(100vh-180px)] pr-4">
                        {detailLoading ? (
                            <div className="flex flex-col items-center justify-center p-20 gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">{t('جاري جلب التفاصيل...', 'Fetching details...')}</p>
                            </div>
                        ) : detailData.length === 0 ? (
                            <div className="text-center py-20 text-muted-foreground">
                                <Info className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p>{t('لا توجد بيانات تفصيلية متوفرة', 'No detailed data available')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {detailData.map((detail, idx) => (
                                    <div key={idx} className="p-4 rounded-lg border bg-card hover:shadow-sm transition-all border-border/50">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <h4 className="font-semibold text-foreground">
                                                    {detail.full_name || t(detail.title_ar || '', detail.title_ar || '')}
                                                </h4>
                                                {detail.email && <p className="text-xs text-muted-foreground">{detail.email}</p>}
                                                {detail.stage_title && <Badge variant="outline" className="text-[10px] h-5">{detail.stage_title}</Badge>}
                                            </div>

                                            <div className="text-end">
                                                {detail.progress_percent !== undefined && (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-end gap-2 text-[11px] font-bold text-primary italic">
                                                            {detail.progress_percent}% {t('منجز', 'Done')}
                                                        </div>
                                                        <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary" style={{ width: `${detail.progress_percent}%` }} />
                                                        </div>
                                                    </div>
                                                )}
                                                {detail.subjects_count !== undefined && (
                                                    <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                                                        <BookMarked className="w-3.5 h-3.5" />
                                                        {detail.subjects_count} {t('مواد', 'Subjects')}
                                                    </div>
                                                )}
                                                {detail.completed_lessons !== undefined && (
                                                    <div className="text-xs font-medium text-muted-foreground">
                                                        {detail.completed_lessons} / {detail.total_lessons} {t('درس', 'Lessons')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {detail.last_activity && (
                                            <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground border-t pt-2 border-border/30">
                                                <Calendar className="w-3 h-3" />
                                                {t('آخر نشاط:', 'Last Activity:')} {formatDate(detail.last_activity)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
    );
}
