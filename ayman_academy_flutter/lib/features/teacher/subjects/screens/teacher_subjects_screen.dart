import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/subject.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/teacher/lessons/screens/teacher_lessons_screen.dart';
import 'package:ayman_academy_app/features/teacher/quizzes/screens/teacher_quizzes_screen.dart';

final teacherSubjectsProvider = FutureProvider<List<Subject>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];
  final data = await supabase
      .from('subjects')
      .select('*, stage:stages(title_ar, title_en)')
      .eq('teacher_id', userId)
      .order('sort_order');
  return (data as List).map((e) => Subject.fromJson(e as Map<String, dynamic>)).toList();
});

class TeacherSubjectsScreen extends ConsumerWidget {
  const TeacherSubjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final subjectsAsync = ref.watch(teacherSubjectsProvider);

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          title: Text(t('موادي', 'My Subjects')),
          actions: [
            IconButton(
              icon: const Icon(Icons.receipt_long),
              tooltip: t('الطلبات', 'Orders'),
              onPressed: () => context.push('/teacher/orders'),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              tooltip: t('مادة جديدة', 'New Subject'),
              onPressed: () async {
                final result = await context.push('/teacher/course/new');
                if (result == true) ref.invalidate(teacherSubjectsProvider);
              },
            ),
          ],
        ),
        body: subjectsAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (subjects) {
            if (subjects.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.menu_book, size: 64, color: AppColors.inkMuted),
                    const SizedBox(height: 16),
                    Text(t('لا توجد مواد', 'No subjects yet'), style: const TextStyle(color: AppColors.inkMuted, fontSize: 16)),
                    const SizedBox(height: 8),
                    Text(t('يمكنك إضافة المواد من لوحة الويب', 'Add subjects from the web dashboard'), style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(teacherSubjectsProvider),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: subjects.length,
                itemBuilder: (context, index) {
                  final s = subjects[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(s.title(lang), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: s.isActive ? AppColors.success.withValues(alpha: 0.1) : AppColors.error.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  s.isActive ? t('نشط', 'Active') : t('غير نشط', 'Inactive'),
                                  style: TextStyle(fontSize: 11, color: s.isActive ? AppColors.success : AppColors.error),
                                ),
                              ),
                            ],
                          ),
                          if (s.isPaid == true) ...[
                            const SizedBox(height: 4),
                            Text('${s.priceAmount?.toInt() ?? 0} ${s.priceCurrency ?? "SYP"}', style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w500)),
                          ],
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () {
                                    Navigator.push(context, MaterialPageRoute(
                                      builder: (_) => TeacherLessonsScreen(subjectId: s.id, subjectTitle: s.title(lang)),
                                    ));
                                  },
                                  icon: const Icon(Icons.article, size: 16),
                                  label: Text(t('الدروس', 'Lessons'), style: const TextStyle(fontSize: 13)),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () {
                                    Navigator.push(context, MaterialPageRoute(
                                      builder: (_) => TeacherQuizzesScreen(subjectId: s.id, subjectTitle: s.title(lang)),
                                    ));
                                  },
                                  icon: const Icon(Icons.quiz, size: 16),
                                  label: Text(t('الاختبارات', 'Quizzes'), style: const TextStyle(fontSize: 13)),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                final result = await context.push('/teacher/course/${s.id}/edit');
                                if (result == true) ref.invalidate(teacherSubjectsProvider);
                              },
                              icon: const Icon(Icons.edit, size: 16),
                              label: Text(t('تعديل المادة', 'Edit Subject'), style: const TextStyle(fontSize: 13)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}
