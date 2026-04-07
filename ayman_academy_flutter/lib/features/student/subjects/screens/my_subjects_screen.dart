import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/shared/widgets/empty_state.dart';
import 'package:ayman_academy_app/features/student/subjects/providers/subjects_provider.dart';

class MySubjectsScreen extends ConsumerWidget {
  const MySubjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final subjectsAsync = ref.watch(mySubjectsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
              return EmptyState(
                icon: Icons.menu_book,
                title: t('لا توجد مواد مسجلة', 'No enrolled subjects'),
                subtitle: t('اكتشف المواد المتاحة وابدأ رحلة التعلم', 'Discover available subjects and start learning'),
                action: ElevatedButton.icon(
                  onPressed: () => context.push('/student/discover'),
                  icon: const Icon(Icons.explore),
                  label: Text(t('اكتشف المواد', 'Discover Subjects')),
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
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
                          blurRadius: 12,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => context.push('/student/subjects/subject/${s.id}'),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              // Subject icon/cover
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [AppColors.primary, AppColors.primaryLight],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: const Center(
                                  child: Icon(Icons.menu_book, color: Colors.white, size: 26),
                                ),
                              ),
                              const SizedBox(width: 14),

                              // Info
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      s.title(lang.languageCode),
                                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if (s.teacherName != null) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        s.teacherName!,
                                        style: const TextStyle(color: AppColors.inkMuted, fontSize: 12),
                                      ),
                                    ],
                                    if (s.progressPercent != null) ...[
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: ClipRRect(
                                              borderRadius: BorderRadius.circular(6),
                                              child: LinearProgressIndicator(
                                                value: s.progressPercent! / 100,
                                                backgroundColor: isDark ? AppColors.borderDark : AppColors.secondary,
                                                valueColor: AlwaysStoppedAnimation(
                                                  s.progressPercent! >= 100 ? AppColors.success : AppColors.primary,
                                                ),
                                                minHeight: 6,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            '${s.progressPercent}%',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: s.progressPercent! >= 100 ? AppColors.success : AppColors.primary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                              ),

                              const SizedBox(width: 8),
                              Icon(Icons.chevron_right, color: AppColors.inkMuted, size: 20),
                            ],
                          ),
                        ),
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
