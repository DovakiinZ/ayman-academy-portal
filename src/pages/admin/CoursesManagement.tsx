import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { Course, Profile } from '@/types/database';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface CourseWithTeacher extends Course {
    profiles: Pick<Profile, 'full_name' | 'email'> | null;
}

export default function CoursesManagement() {
    const { t } = useLanguage();
    const [courses, setCourses] = useState<CourseWithTeacher[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCourses() {
            const { data } = await supabase
                .from('courses')
                .select('*, profiles(full_name, email)')
                .order('created_at', { ascending: false });

            setCourses(data || []);
            setLoading(false);
        }

        fetchCourses();
    }, []);

    const stages: Record<string, { ar: string; en: string }> = {
        'tamhidi': { ar: 'تمهيدي', en: 'Preparatory' },
        'ibtidai': { ar: 'ابتدائي', en: 'Primary' },
        'mutawasit': { ar: 'متوسط', en: 'Middle' },
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('إدارة الدورات', 'Courses Management')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('عرض جميع الدورات في الأكاديمية', 'View all courses in the academy')}
                </p>
            </div>

            <div className="bg-background rounded-lg border border-border overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </div>
                ) : courses.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        {t('لا توجد دورات حتى الآن', 'No courses yet')}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('عنوان الدورة', 'Course Title')}</TableHead>
                                <TableHead>{t('المعلم', 'Teacher')}</TableHead>
                                <TableHead>{t('المرحلة', 'Stage')}</TableHead>
                                <TableHead>{t('الحالة', 'Status')}</TableHead>
                                <TableHead>{t('تاريخ الإنشاء', 'Created')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {courses.map((course) => (
                                <TableRow key={course.id}>
                                    <TableCell className="font-medium">{course.title_ar}</TableCell>
                                    <TableCell>{course.profiles?.full_name || course.profiles?.email || '-'}</TableCell>
                                    <TableCell>
                                        {t(stages[course.stage_id]?.ar || course.stage_id, stages[course.stage_id]?.en || course.stage_id)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={course.is_published ? 'default' : 'secondary'}>
                                            {course.is_published ? t('منشور', 'Published') : t('مسودة', 'Draft')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(course.created_at).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
