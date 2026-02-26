import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

const STALE = {
  static: 10 * 60 * 1000,   // 10 min — stages, subjects (rarely change)
  medium: 5 * 60 * 1000,    // 5 min — lessons, quiz questions
  user: 2 * 60 * 1000,      // 2 min — progress, dashboard
  realtime: 60 * 1000,       // 1 min — messages contacts
};

// ─── Stages ──────────────────────────────────────────────

export function useStages() {
  return useQuery({
    queryKey: queryKeys.stages.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stages')
        .select('*, subjects(id)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        subjects_count: s.subjects?.length || 0,
      }));
    },
    staleTime: STALE.static,
  });
}

// ─── Subjects ────────────────────────────────────────────

export function useSubjects(stageId?: string) {
  return useQuery({
    queryKey: stageId
      ? queryKeys.subjects.byStage(stageId)
      : queryKeys.subjects.all,
    queryFn: async () => {
      let query = supabase
        .from('subjects')
        .select('*, stage:stages(*), lessons(id)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (stageId) {
        query = query.eq('stage_id', stageId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        lessons_count: s.lessons?.length || 0,
      }));
    },
    staleTime: STALE.static,
  });
}

// ─── Single Stage ────────────────────────────────────────

export function useStage(stageId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.stages.detail(stageId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .eq('id', stageId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!stageId,
    staleTime: STALE.static,
  });
}

// ─── Lessons by Subject (with user progress) ─────────────

export function useLessons(subjectId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lessons.bySubject(subjectId!),
    queryFn: async () => {
      // Fetch subject with stage info
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*, stage:stages(*)')
        .eq('id', subjectId!)
        .single();

      if (subjectError || !subjectData) throw subjectError || new Error('Subject not found');

      // Fetch published lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('subject_id', subjectId!)
        .eq('is_published', true)
        .order('order_index', { ascending: true });

      if (lessonsError) throw lessonsError;
      const lessons = lessonsData || [];

      // Fetch user progress if logged in
      let progressMap: Record<string, any> = {};
      if (userId && lessons.length > 0) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', userId)
          .in('lesson_id', lessons.map(l => l.id));

        (progressData || []).forEach((p: any) => {
          progressMap[p.lesson_id] = p;
        });
      }

      return {
        subject: subjectData,
        lessons: lessons.map((l: any) => ({
          ...l,
          progress: progressMap[l.id] || null,
        })),
      };
    },
    enabled: !!subjectId,
    staleTime: STALE.medium,
  });
}

// ─── Single Lesson (full detail with blocks) ─────────────

export function useLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lessons.detail(lessonId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          *,
          subject:subjects(*),
          content_items:lesson_content_items(*),
          sections:lesson_sections(*),
          blocks:lesson_blocks(*)
        `)
        .eq('id', lessonId!)
        .eq('is_published', true)
        .single();

      if (error) throw error;

      const d = data as any;
      d.sections = (d.sections || []).sort((a: any, b: any) => a.order_index - b.order_index);
      d.blocks = (d.blocks || []).sort((a: any, b: any) => a.order_index - b.order_index);

      // Fetch quiz ID
      const { data: quizData } = await supabase
        .from('lesson_quizzes')
        .select('id')
        .eq('lesson_id', lessonId!)
        .single();

      // Fetch next lesson
      const { data: nextData } = await supabase
        .from('lessons')
        .select('*')
        .eq('subject_id', d.subject_id)
        .eq('is_published', true)
        .gt('order_index', d.order_index)
        .order('order_index', { ascending: true })
        .limit(1)
        .single();

      return {
        lesson: d,
        quizId: quizData?.id || null,
        nextLesson: nextData || null,
      };
    },
    enabled: !!lessonId,
    staleTime: STALE.medium,
  });
}

// ─── Student Progress (all lessons) ──────────────────────

export function useStudentProgress(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.student.progress(userId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select(`
          *,
          lesson:lessons(
            *,
            subject:subjects(
              *,
              stage:stages(*)
            )
          )
        `)
        .eq('user_id', userId!)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: STALE.user,
  });
}

// ─── Quiz Questions ──────────────────────────────────────

export function useQuizQuestions(quizId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.quiz.questions(quizId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_quiz_questions')
        .select('*')
        .eq('quiz_id', quizId!)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!quizId,
    staleTime: STALE.medium,
  });
}

// ─── Student Teachers ────────────────────────────────────

export function useStudentTeachers(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.student.teachers(userId!),
    queryFn: async () => {
      // Derive teachers from lesson progress (student studied their lessons)
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson:lessons(created_by)')
        .eq('user_id', userId!);

      const teacherIdSet = new Set<string>();
      if (progressData) {
        progressData.forEach((p: any) => {
          if (p.lesson?.created_by) teacherIdSet.add(p.lesson.created_by);
        });
      }

      // If no progress yet, show all active teachers
      if (teacherIdSet.size === 0) {
        const { data: allTeachers } = await supabase
          .from('profiles')
          .select('*, lessons(count)')
          .eq('role', 'teacher')
          .eq('is_active', true);

        return (allTeachers || []).map((t: any) => ({
          ...t,
          lessons_count: t.lessons?.[0]?.count || 0,
        }));
      }

      const { data: teachersData } = await supabase
        .from('profiles')
        .select('*, lessons(count)')
        .in('id', Array.from(teacherIdSet))
        .eq('role', 'teacher')
        .eq('is_active', true);

      return (teachersData || []).map((t: any) => ({
        ...t,
        lessons_count: t.lessons?.[0]?.count || 0,
      }));
    },
    enabled: !!userId,
    staleTime: STALE.medium,
  });
}

// ─── Message Contacts ────────────────────────────────────

export function useMessageContacts(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.messages.contacts(userId!),
    queryFn: async () => {
      // Strategy: find teachers from two sources and merge
      const teacherIdSet = new Set<string>();

      // 1. Teachers from lesson progress (student studied their lessons)
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson:lessons(created_by)')
        .eq('user_id', userId!);

      if (progressData) {
        progressData.forEach((p: any) => {
          if (p.lesson?.created_by) teacherIdSet.add(p.lesson.created_by);
        });
      }

      // 2. Teachers from existing message history (sent or received)
      const { data: sentMessages } = await supabase
        .from('messages')
        .select('receiver_id')
        .eq('sender_id', userId!);

      const { data: receivedMessages } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', userId!);

      if (sentMessages) {
        sentMessages.forEach((m: any) => teacherIdSet.add(m.receiver_id));
      }
      if (receivedMessages) {
        receivedMessages.forEach((m: any) => teacherIdSet.add(m.sender_id));
      }

      // 3. If still empty, show all active teachers so student can initiate contact
      if (teacherIdSet.size === 0) {
        const { data: allTeachers } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'teacher')
          .eq('is_active', true);

        if (!allTeachers || allTeachers.length === 0) return [];

        return allTeachers.map((t: any) => ({ ...t, unread_count: 0 }));
      }

      const ids = Array.from(teacherIdSet);

      // Fetch teacher profiles (filter to actual teachers, not other students from messages)
      const { data: teachers } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids)
        .in('role', ['teacher', 'super_admin']);

      if (!teachers || teachers.length === 0) return [];

      // Get unread counts
      const contactsWithMeta = [];
      for (const teacher of teachers) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('sender_id', teacher.id)
          .eq('receiver_id', userId!)
          .is('read_at', null);

        contactsWithMeta.push({
          ...teacher,
          unread_count: count || 0,
        });
      }

      return contactsWithMeta;
    },
    enabled: !!userId,
    staleTime: STALE.realtime,
  });
}

// ─── Teacher Message Contacts ────────────────────────────

export function useTeacherMessageContacts(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.messages.contacts(userId!),
    queryFn: async () => {
      const contactIdSet = new Set<string>();

      // 1. Students from existing message history
      const { data: sentMessages } = await supabase
        .from('messages')
        .select('receiver_id')
        .eq('sender_id', userId!);

      const { data: receivedMessages } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', userId!);

      if (sentMessages) {
        sentMessages.forEach((m: any) => contactIdSet.add(m.receiver_id));
      }
      if (receivedMessages) {
        receivedMessages.forEach((m: any) => contactIdSet.add(m.sender_id));
      }

      // 2. Students with progress on teacher's lessons
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('created_by', userId!);

      if (lessons && lessons.length > 0) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('user_id')
          .in('lesson_id', lessons.map(l => l.id));

        if (progressData) {
          progressData.forEach((p: any) => contactIdSet.add(p.user_id));
        }
      }

      if (contactIdSet.size === 0) return [];

      const ids = Array.from(contactIdSet);

      // Fetch student profiles
      const { data: students } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids)
        .eq('role', 'student');

      if (!students || students.length === 0) return [];

      // Get unread counts
      const contactsWithMeta = [];
      for (const student of students) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('sender_id', student.id)
          .eq('receiver_id', userId!)
          .is('read_at', null);

        contactsWithMeta.push({
          ...student,
          unread_count: count || 0,
        });
      }

      return contactsWithMeta;
    },
    enabled: !!userId,
    staleTime: STALE.realtime,
  });
}

// ─── Homepage: Featured Content ──────────────────────────

export function useFeaturedSubjects() {
  return useQuery({
    queryKey: queryKeys.homepage.featuredSubjects,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, title_ar, title_en, teaser_ar, teaser_en, stage:stages(id, title_ar, title_en)')
        .eq('is_active', true)
        .eq('show_on_home', true)
        .order('home_order', { ascending: true })
        .limit(4);

      if (error) throw error;
      return data || [];
    },
    staleTime: STALE.static,
  });
}

export function useFeaturedLessons() {
  return useQuery({
    queryKey: queryKeys.homepage.featuredLessons,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id, title_ar, title_en, teaser_ar, teaser_en, preview_video_url, duration_seconds,
          teacher:profiles!created_by(full_name),
          subject:subjects(title_ar, title_en, stage:stages(title_ar, title_en))
        `)
        .eq('is_published', true)
        .eq('show_on_home', true)
        .order('home_order', { ascending: true })
        .limit(4);

      if (error) throw error;
      return data || [];
    },
    staleTime: STALE.static,
  });
}

export function useFeaturedTeachers() {
  return useQuery({
    queryKey: queryKeys.homepage.featuredTeachers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio_ar, bio_en')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .eq('show_on_home', true)
        .order('home_order', { ascending: true })
        .limit(6);

      if (error) throw error;
      return data || [];
    },
    staleTime: STALE.static,
  });
}

export function useHomeStages() {
  return useQuery({
    queryKey: [...queryKeys.stages.all, 'home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stages')
        .select('id, slug, title_ar, title_en, description_ar, description_en, teaser_ar, teaser_en')
        .eq('show_on_home', true)
        .eq('is_active', true)
        .order('home_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: STALE.static,
  });
}

// ─── Course Content Sidebar ──────────────────────────────

export function useSidebarLessons(subjectId: string, userId: string) {
  return useQuery({
    queryKey: ['sidebar', subjectId, userId],
    queryFn: async () => {
      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('is_published', true)
        .order('order_index', { ascending: true });

      if (error) throw error;
      const lessons = lessonsData || [];

      let progressMap: Record<string, any> = {};
      if (lessons.length > 0) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', userId)
          .in('lesson_id', lessons.map(l => l.id));

        (progressData || []).forEach((p: any) => {
          progressMap[p.lesson_id] = p;
        });
      }

      return lessons.map((l: any) => ({
        ...l,
        progress: progressMap[l.id] || null,
      }));
    },
    staleTime: STALE.user,
  });
}

// ─── Teacher Public Profile ──────────────────────────────

export function useTeacherProfile(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-profile', teacherId!],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', teacherId!)
        .eq('role', 'teacher')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!teacherId,
    staleTime: STALE.static,
  });
}

export function useTeacherPublicSubjects(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-public-subjects', teacherId],
    queryFn: async () => {
      // Get all published lessons by this teacher and their subjects
      const { data: lessons, error } = await supabase
        .from('lessons')
        .select(`
          subject_id,
          subject:subjects(
            id, 
            title_ar, 
            title_en,
            teaser_ar,
            teaser_en,
            stage:stages(id, title_ar, title_en)
          )
        `)
        .eq('created_by', teacherId!)
        .eq('is_published', true);

      if (error) throw error;

      // Group by subject and count lessons
      const subjectMap = new Map<string, any>();

      for (const lesson of (lessons || [])) {
        const anyLesson = lesson as any;
        if (!anyLesson.subject) continue;
        const subj = Array.isArray(anyLesson.subject) ? anyLesson.subject[0] : anyLesson.subject;
        if (!subj) continue;

        if (subjectMap.has(subj.id)) {
          subjectMap.get(subj.id).lessons_count++;
        } else {
          subjectMap.set(subj.id, {
            ...subj,
            lessons_count: 1
          });
        }
      }

      return Array.from(subjectMap.values());
    },
    enabled: !!teacherId,
    staleTime: STALE.static,
  });
}
