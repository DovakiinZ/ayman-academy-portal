/**
 * Admin API Service Layer
 * Centralized data access for admin panel CRUD operations
 */

import { supabase } from '@/lib/supabase';
import type { Level, Subject, Course, Lesson, Profile, TeacherInvite } from '@/types/database';

// ============================================
// RESPONSE TYPE
// ============================================

export interface ApiResponse<T> {
    data: T | null;
    error: string | null;
}

// ============================================
// LEVELS
// ============================================

export async function getLevels(): Promise<ApiResponse<Level[]>> {
    console.log('[AdminAPI] getLevels: start');
    const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('[AdminAPI] getLevels error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] getLevels: success, count:', data?.length);
    return { data, error: null };
}

export async function createLevel(level: {
    slug: string;
    title_ar: string;
    title_en?: string;
    sort_order?: number;
    is_active?: boolean;
}): Promise<ApiResponse<Level>> {
    console.log('[AdminAPI] createLevel:', level.title_ar);
    const { data, error } = await supabase
        .from('levels')
        .insert(level)
        .select()
        .single();

    if (error) {
        console.error('[AdminAPI] createLevel error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] createLevel: success, id:', data?.id);
    return { data, error: null };
}

export async function updateLevel(id: string, updates: {
    title_ar?: string;
    title_en?: string;
    sort_order?: number;
    is_active?: boolean;
}): Promise<ApiResponse<Level>> {
    console.log('[AdminAPI] updateLevel:', id);
    const { data, error } = await supabase
        .from('levels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[AdminAPI] updateLevel error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] updateLevel: success');
    return { data, error: null };
}

export async function deleteLevel(id: string): Promise<ApiResponse<null>> {
    console.log('[AdminAPI] deleteLevel:', id);
    const { error } = await supabase
        .from('levels')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[AdminAPI] deleteLevel error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] deleteLevel: success');
    return { data: null, error: null };
}

// ============================================
// SUBJECTS
// ============================================

export async function getSubjects(levelId?: string): Promise<ApiResponse<Subject[]>> {
    console.log('[AdminAPI] getSubjects: levelId=', levelId);
    let query = supabase
        .from('subjects')
        .select('*, level:levels(*)')
        .order('sort_order', { ascending: true });

    if (levelId) {
        query = query.eq('level_id', levelId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[AdminAPI] getSubjects error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] getSubjects: success, count:', data?.length);
    return { data, error: null };
}

export async function createSubject(subject: {
    level_id: string;
    slug: string;
    title_ar: string;
    title_en?: string;
    sort_order?: number;
    is_active?: boolean;
}): Promise<ApiResponse<Subject>> {
    console.log('[AdminAPI] createSubject:', subject.title_ar);
    const { data, error } = await supabase
        .from('subjects')
        .insert(subject)
        .select()
        .single();

    if (error) {
        console.error('[AdminAPI] createSubject error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] createSubject: success, id:', data?.id);
    return { data, error: null };
}

export async function updateSubject(id: string, updates: {
    title_ar?: string;
    title_en?: string;
    sort_order?: number;
    is_active?: boolean;
}): Promise<ApiResponse<Subject>> {
    console.log('[AdminAPI] updateSubject:', id);
    const { data, error } = await supabase
        .from('subjects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[AdminAPI] updateSubject error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] updateSubject: success');
    return { data, error: null };
}

export async function deleteSubject(id: string): Promise<ApiResponse<null>> {
    console.log('[AdminAPI] deleteSubject:', id);
    const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[AdminAPI] deleteSubject error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] deleteSubject: success');
    return { data: null, error: null };
}

// ============================================
// COURSES
// ============================================

export interface CourseFilters {
    levelId?: string;
    subjectId?: string;
    teacherId?: string;
    isPublished?: boolean;
    isPaid?: boolean;
}

export interface CourseWithRelations extends Course {
    teacher?: Pick<Profile, 'id' | 'full_name' | 'email'>;
    level?: Level;
    subject?: Subject;
}

export async function getCourses(filters?: CourseFilters): Promise<ApiResponse<CourseWithRelations[]>> {
    console.log('[AdminAPI] getCourses: filters=', filters);
    let query = supabase
        .from('courses')
        .select('*, teacher:profiles!teacher_id(id, full_name, email), level:levels(*), subject:subjects(*)')
        .order('created_at', { ascending: false });

    if (filters?.levelId) query = query.eq('level_id', filters.levelId);
    if (filters?.subjectId) query = query.eq('subject_id', filters.subjectId);
    if (filters?.teacherId) query = query.eq('teacher_id', filters.teacherId);
    if (filters?.isPublished !== undefined) query = query.eq('is_published', filters.isPublished);
    if (filters?.isPaid !== undefined) query = query.eq('is_paid', filters.isPaid);

    const { data, error } = await query;

    if (error) {
        console.error('[AdminAPI] getCourses error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] getCourses: success, count:', data?.length);
    return { data, error: null };
}

export async function createCourse(course: {
    teacher_id: string;
    level_id: string;
    subject_id?: string;
    slug: string;
    title_ar: string;
    title_en?: string;
    description_ar?: string;
    description_en?: string;
    cover_image_url?: string;
    is_published?: boolean;
    is_paid?: boolean;
    price_amount?: number;
}): Promise<ApiResponse<Course>> {
    console.log('[AdminAPI] createCourse:', course.title_ar);
    const { data, error } = await supabase
        .from('courses')
        .insert(course)
        .select()
        .single();

    if (error) {
        console.error('[AdminAPI] createCourse error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] createCourse: success, id:', data?.id);
    return { data, error: null };
}

export async function updateCourse(id: string, updates: {
    level_id?: string;
    subject_id?: string | null;
    title_ar?: string;
    title_en?: string;
    description_ar?: string;
    description_en?: string;
    cover_image_url?: string;
    is_published?: boolean;
    is_paid?: boolean;
    price_amount?: number;
}): Promise<ApiResponse<Course>> {
    console.log('[AdminAPI] updateCourse:', id);
    const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[AdminAPI] updateCourse error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] updateCourse: success');
    return { data, error: null };
}

export async function deleteCourse(id: string): Promise<ApiResponse<null>> {
    console.log('[AdminAPI] deleteCourse:', id);
    const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[AdminAPI] deleteCourse error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] deleteCourse: success');
    return { data: null, error: null };
}

// ============================================
// LESSONS
// ============================================

export async function getLessons(courseId: string): Promise<ApiResponse<Lesson[]>> {
    console.log('[AdminAPI] getLessons: courseId=', courseId);
    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

    if (error) {
        console.error('[AdminAPI] getLessons error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] getLessons: success, count:', data?.length);
    return { data, error: null };
}

export async function createLesson(lesson: {
    course_id: string;
    slug: string;
    title_ar: string;
    title_en?: string;
    summary_ar?: string;
    summary_en?: string;
    duration_seconds?: number;
    order_index?: number;
    preview_video_url?: string;
    full_video_url?: string;
    is_free_preview?: boolean;
    is_published?: boolean;
}): Promise<ApiResponse<Lesson>> {
    console.log('[AdminAPI] createLesson:', lesson.title_ar);
    const { data, error } = await supabase
        .from('lessons')
        .insert(lesson)
        .select()
        .single();

    if (error) {
        console.error('[AdminAPI] createLesson error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] createLesson: success, id:', data?.id);
    return { data, error: null };
}

export async function updateLesson(id: string, updates: {
    title_ar?: string;
    title_en?: string;
    summary_ar?: string;
    summary_en?: string;
    duration_seconds?: number;
    order_index?: number;
    preview_video_url?: string;
    full_video_url?: string;
    is_free_preview?: boolean;
    is_published?: boolean;
}): Promise<ApiResponse<Lesson>> {
    console.log('[AdminAPI] updateLesson:', id);
    const { data, error } = await supabase
        .from('lessons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[AdminAPI] updateLesson error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] updateLesson: success');
    return { data, error: null };
}

export async function deleteLesson(id: string): Promise<ApiResponse<null>> {
    console.log('[AdminAPI] deleteLesson:', id);
    const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[AdminAPI] deleteLesson error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] deleteLesson: success');
    return { data: null, error: null };
}

export async function reorderLesson(id: string, newIndex: number): Promise<ApiResponse<Lesson>> {
    // Just update the order_index; caller handles swapping logic
    return updateLesson(id, { order_index: newIndex });
}

// ============================================
// TEACHERS
// ============================================

export async function getTeachers(): Promise<ApiResponse<Profile[]>> {
    console.log('[AdminAPI] getTeachers: start');
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[AdminAPI] getTeachers error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] getTeachers: success, count:', data?.length);
    return { data, error: null };
}

export async function getTeacherInvites(): Promise<ApiResponse<TeacherInvite[]>> {
    console.log('[AdminAPI] getTeacherInvites: start');
    const { data, error } = await supabase
        .from('teacher_invites')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[AdminAPI] getTeacherInvites error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] getTeacherInvites: success, count:', data?.length);
    return { data, error: null };
}

export async function createTeacherInvite(invite: {
    email: string;
    full_name: string;
    created_by: string;
}): Promise<ApiResponse<TeacherInvite>> {
    console.log('[AdminAPI] createTeacherInvite:', invite.email);

    // Generate a secure token hash
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token_hash = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    const { data, error } = await supabase
        .from('teacher_invites')
        .insert({
            email: invite.email,
            full_name: invite.full_name,
            token_hash,
            status: 'pending',
            created_by: invite.created_by,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error('[AdminAPI] createTeacherInvite error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] createTeacherInvite: success, id:', data?.id);
    return { data, error: null };
}

export async function resendInvite(id: string): Promise<ApiResponse<TeacherInvite>> {
    console.log('[AdminAPI] resendInvite:', id);
    const { data, error } = await supabase
        .from('teacher_invites')
        .update({
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[AdminAPI] resendInvite error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] resendInvite: success');
    return { data, error: null };
}

export async function deleteInvite(id: string): Promise<ApiResponse<null>> {
    console.log('[AdminAPI] deleteInvite:', id);
    const { error } = await supabase
        .from('teacher_invites')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[AdminAPI] deleteInvite error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] deleteInvite: success');
    return { data: null, error: null };
}

export async function toggleTeacherStatus(id: string, isActive: boolean): Promise<ApiResponse<Profile>> {
    console.log('[AdminAPI] toggleTeacherStatus:', id, isActive);
    const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[AdminAPI] toggleTeacherStatus error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] toggleTeacherStatus: success');
    return { data, error: null };
}

export async function deleteTeacher(id: string): Promise<ApiResponse<null>> {
    console.log('[AdminAPI] deleteTeacher:', id);
    // This will cascade delete due to FK constraints
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[AdminAPI] deleteTeacher error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] deleteTeacher: success');
    return { data: null, error: null };
}

// ============================================
// STATS (Dashboard)
// ============================================

export interface AdminStats {
    teachers: number;
    courses: number;
    lessons: number;
    pendingInvites: number;
}

export async function getAdminStats(): Promise<ApiResponse<AdminStats>> {
    console.log('[AdminAPI] getAdminStats: start');

    const [teachersRes, coursesRes, lessonsRes, invitesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('lessons').select('id', { count: 'exact', head: true }),
        supabase.from('teacher_invites').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    // Check for any errors
    const firstError = [teachersRes, coursesRes, lessonsRes, invitesRes].find(r => r.error);
    if (firstError?.error) {
        console.error('[AdminAPI] getAdminStats error:', firstError.error.message);
        return { data: null, error: firstError.error.message };
    }

    const stats: AdminStats = {
        teachers: teachersRes.count || 0,
        courses: coursesRes.count || 0,
        lessons: lessonsRes.count || 0,
        pendingInvites: invitesRes.count || 0,
    };

    console.log('[AdminAPI] getAdminStats: success', stats);
    return { data: stats, error: null };
}

// ============================================
// HELPER: Get all teachers for dropdowns
// ============================================

export async function getTeachersForSelect(): Promise<ApiResponse<Pick<Profile, 'id' | 'full_name' | 'email'>[]>> {
    console.log('[AdminAPI] getTeachersForSelect: start');
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

    if (error) {
        console.error('[AdminAPI] getTeachersForSelect error:', error.message);
        return { data: null, error: error.message };
    }

    console.log('[AdminAPI] getTeachersForSelect: success, count:', data?.length);
    return { data, error: null };
}
