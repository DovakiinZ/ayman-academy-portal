import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/subjects/providers/subjects_provider.dart';

class MySubjectsScreen extends ConsumerWidget {
  const MySubjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final subjectsAsync = ref.watch(mySubjectsProvider);

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          title: Text(t('موادي', 'My Subjects')),
          actions: [
            IconButton(
              icon: const Icon(Icons.explore),
              tooltip: t('اكتشف', 'Discover'),
              onPressed: () => context.push('/student/discover'),
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
                    Text(t('لا توجد مواد مسجلة', 'No enrolled subjects'), style: const TextStyle(color: AppColors.inkMuted, fontSize: 16)),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => context.push('/student/discover'),
                      icon: const Icon(Icons.explore),
                      label: Text(t('اكتشف المواد', 'Discover Subjects')),
                    ),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(mySubjectsProvider),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: subjects.length,
                itemBuilder: (context, index) {
                  final s = subjects[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(16),
                      title: Text(s.title(lang.languageCode), style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (s.teacherName != null) ...[
                            const SizedBox(height: 4),
                            Text(s.teacherName!, style: const TextStyle(color: AppColors.inkMuted, fontSize: 12)),
                          ],
                          if (s.progressPercent != null) ...[
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: s.progressPercent! / 100,
                                backgroundColor: AppColors.border,
                                valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text('${s.progressPercent}%', style: const TextStyle(fontSize: 11, color: AppColors.inkMuted)),
                          ],
                        ],
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/student/subjects/subject/${s.id}'),
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
