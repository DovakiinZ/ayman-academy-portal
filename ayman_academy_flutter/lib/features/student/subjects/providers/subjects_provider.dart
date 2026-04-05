import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/shared/models/subject.dart';
import 'package:ayman_academy_app/shared/models/lesson.dart';
import 'package:ayman_academy_app/shared/services/cached_provider_helpers.dart';
import 'package:ayman_academy_app/shared/services/cache_service.dart';

final mySubjectsProvider = FutureProvider<List<Subject>>((ref) async {
  return cachedListFetch<Subject>(
    cacheKey: 'my_subjects',
    boxName: 'subjects_cache',
    ttl: CacheService.subjectsTtl,
    fetch: () async {
      final data = await supabase.rpc('get_student_subjects');
      return data is List ? data : [];
    },
    fromJson: (json) => Subject.fromJson(json),
  );
});

final discoverSubjectsProvider = FutureProvider<List<Subject>>((ref) async {
  return cachedListFetch<Subject>(
    cacheKey: 'discover_subjects',
    boxName: 'subjects_cache',
    ttl: CacheService.subjectsTtl,
    fetch: () async {
      final data = await supabase.rpc('get_discover_subjects');
      return data is List ? data : [];
    },
    fromJson: (json) => Subject.fromJson(json),
  );
});

final subjectDetailProvider = FutureProvider.family<Subject?, String>((ref, subjectId) async {
  final data = await supabase
      .from('subjects')
      .select('*, stage:stages(id, slug, title_ar, title_en), teacher:profiles!teacher_id(full_name, avatar_url, bio_ar, bio_en)')
      .eq('id', subjectId)
      .single();
  return Subject.fromJson(data);
});

final subjectLessonsProvider = FutureProvider.family<List<Lesson>, String>((ref, subjectId) async {
  final userId = supabase.auth.currentUser?.id;
  final data = await supabase
      .from('lessons')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('is_published', true)
      .order('sort_order');

  final lessons = (data as List).map((e) => Lesson.fromJson(e as Map<String, dynamic>)).toList();

  // Fetch progress for each lesson if user is logged in
  if (userId != null && lessons.isNotEmpty) {
    final lessonIds = lessons.map((l) => l.id).toList();
    final progressData = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .inFilter('lesson_id', lessonIds);

    final progressMap = <String, Map<String, dynamic>>{};
    for (final p in (progressData as List)) {
      progressMap[p['lesson_id'] as String] = p as Map<String, dynamic>;
    }

    // We can't modify immutable Lesson objects, so we return as-is
    // Progress will be fetched separately per lesson
  }

  return lessons;
});

final lessonProgressMapProvider = FutureProvider.family<Map<String, int>, String>((ref, subjectId) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return {};

  final lessons = await supabase
      .from('lessons')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('is_published', true);

  final lessonIds = (lessons as List).map((l) => l['id'] as String).toList();
  if (lessonIds.isEmpty) return {};

  final progressData = await supabase
      .from('lesson_progress')
      .select('lesson_id, progress_percent, completed_at')
      .eq('user_id', userId)
      .inFilter('lesson_id', lessonIds);

  final map = <String, int>{};
  for (final p in (progressData as List)) {
    map[p['lesson_id'] as String] = p['completed_at'] != null ? 100 : (p['progress_percent'] as int? ?? 0);
  }
  return map;
});

final checkSubjectAccessProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, subjectId) async {
  try {
    final result = await supabase.rpc('check_subject_access', params: {'p_subject_id': subjectId});
    if (result is Map) return Map<String, dynamic>.from(result);
    return {'has_access': false};
  } catch (_) {
    return {'has_access': true}; // Default to allowing if RPC fails
  }
});
