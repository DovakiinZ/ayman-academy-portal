import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentTeachers } from '@/hooks/useQueryHooks';
import { User, BookOpen, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StudentTeachers() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const { data: teachers = [], isLoading: loading } = useStudentTeachers(profile?.id);

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('المعلمون', 'My Teachers')}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {t('المعلمون الذين يمكنك التواصل معهم', 'Teachers you can connect with')}
                </p>
            </div>

            {teachers.length === 0 ? (
                <div className="bg-background rounded-lg border border-border p-8 text-center">
                    <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-medium text-foreground mb-2">
                        {t('لا يوجد معلمون متاحون', 'No teachers available')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t('ابدأ بتصفح المواد للتواصل مع المعلمين', 'Start browsing subjects to connect with teachers')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teachers.map((teacher: any) => (
                        <div
                            key={teacher.id}
                            className="bg-background rounded-lg border border-border p-6"
                        >
                            {/* Avatar */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                                    {teacher.avatar_url ? (
                                        <img
                                            src={teacher.avatar_url}
                                            alt={teacher.full_name || ''}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <User className="w-6 h-6 text-muted-foreground" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">
                                        {teacher.full_name || t('معلم', 'Teacher')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {teacher.email}
                                    </p>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                <span className="flex items-center gap-1">
                                    <BookOpen className="w-4 h-4" />
                                    {teacher.lessons_count} {t('درس', 'lessons')}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Link to={`/student/messages?teacher=${teacher.id}`} className="flex-1">
                                    <Button variant="outline" className="w-full" size="sm">
                                        <MessageSquare className="w-4 h-4 me-2" />
                                        {t('مراسلة', 'Message')}
                                    </Button>
                                </Link>
                                <Link to={`/student/stages`}>
                                    <Button variant="ghost" size="sm">
                                        {t('تصفح', 'Browse')}
                                        <ChevronIcon className="w-4 h-4 ms-1" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
