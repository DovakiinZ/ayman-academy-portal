import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/subjects/providers/subjects_provider.dart';

class SubjectDetailScreen extends ConsumerWidget {
  final String subjectId;

  const SubjectDetailScreen({super.key, required this.subjectId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final subjectAsync = ref.watch(subjectDetailProvider(subjectId));
    final lessonsAsync = ref.watch(subjectLessonsProvider(subjectId));
    final progressAsync = ref.watch(lessonProgressMapProvider(subjectId));

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        body: subjectAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (subject) {
            if (subject == null) return Center(child: Text(t('المادة غير موجودة', 'Subject not found')));
            return CustomScrollView(
              slivers: [
                // Hero header
                SliverAppBar(
                  expandedHeight: 200,
                  pinned: true,
                  flexibleSpace: FlexibleSpaceBar(
                    title: Text(
                      subject.title(lang),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    background: subject.coverImageUrl != null
                        ? CachedNetworkImage(
                            imageUrl: subject.coverImageUrl!,
                            fit: BoxFit.cover,
                            color: Colors.black.withValues(alpha: 0.3),
                            colorBlendMode: BlendMode.darken,
                          )
                        : Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [AppColors.primary, AppColors.primaryLight],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                            ),
                          ),
                  ),
                ),

                // Info section
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Description
                        if (subject.description(lang).isNotEmpty) ...[
                          Text(
                            subject.description(lang),
                            style: const TextStyle(fontSize: 14, height: 1.7, color: AppColors.inkMuted),
                          ),
                          const SizedBox(height: 16),
                        ],

                        // Stats row
                        Row(
                          children: [
                            _InfoChip(
                              icon: Icons.article,
                              label: lessonsAsync.when(
                                data: (l) => '${l.length} ${t("درس", "lessons")}',
                                loading: () => '...',
                                error: (_, _) => '-',
                              ),
                            ),
                            const SizedBox(width: 12),
                            if (subject.stage != null)
                              _InfoChip(
                                icon: Icons.school,
                                label: subject.stage!.title(lang),
                              ),
                            const SizedBox(width: 12),
                            _InfoChip(
                              icon: subject.accessType == 'public' ? Icons.lock_open : Icons.lock,
                              label: _accessLabel(subject.accessType, t),
                            ),
                          ],
                        ),

                        // Price
                        if (subject.isPaid == true) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.gold.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.gold.withValues(alpha: 0.3)),
                            ),
                            child: Text(
                              '${subject.priceAmount?.toInt() ?? 0} ${subject.priceCurrency ?? "SYP"}',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.gold, fontSize: 16),
                            ),
                          ),
                        ],

                        const SizedBox(height: 24),
                        Text(
                          t('المنهج', 'Curriculum'),
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
                ),

                // Lessons list
                lessonsAsync.when(
                  loading: () => const SliverFillRemaining(child: LoadingShimmer(itemCount: 3)),
                  error: (e, _) => SliverToBoxAdapter(child: Center(child: Text('$e'))),
                  data: (lessons) {
                    final progressMap = progressAsync.valueOrNull ?? {};
                    if (lessons.isEmpty) {
                      return SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Center(
                            child: Text(t('لا توجد دروس بعد', 'No lessons yet'), style: const TextStyle(color: AppColors.inkMuted)),
                          ),
                        ),
                      );
                    }
                    return SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final lesson = lessons[index];
                          final progress = progressMap[lesson.id] ?? 0;
                          final isCompleted = progress >= 100;

                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            leading: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: isCompleted
                                    ? AppColors.success.withValues(alpha: 0.1)
                                    : progress > 0
                                        ? AppColors.primary.withValues(alpha: 0.1)
                                        : AppColors.border.withValues(alpha: 0.3),
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: isCompleted
                                    ? const Icon(Icons.check, color: AppColors.success, size: 18)
                                    : Text(
                                        '${index + 1}',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                          color: progress > 0 ? AppColors.primary : AppColors.inkMuted,
                                        ),
                                      ),
                              ),
                            ),
                            title: Text(
                              lesson.title(lang),
                              style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                            ),
                            subtitle: Row(
                              children: [
                                if (lesson.durationMinutes != null) ...[
                                  Icon(Icons.access_time, size: 12, color: AppColors.inkMuted),
                                  const SizedBox(width: 4),
                                  Text('${lesson.durationMinutes} ${t("د", "min")}', style: const TextStyle(fontSize: 11, color: AppColors.inkMuted)),
                                  const SizedBox(width: 12),
                                ],
                                if (progress > 0 && !isCompleted)
                                  Text('$progress%', style: const TextStyle(fontSize: 11, color: AppColors.primary)),
                              ],
                            ),
                            trailing: lesson.isPaid
                                ? const Icon(Icons.lock, size: 16, color: AppColors.inkMuted)
                                : const Icon(Icons.chevron_right, size: 20),
                            onTap: () {
                              context.push('/student/subjects/subject/$subjectId/lesson/${lesson.id}');
                            },
                          );
                        },
                        childCount: lessons.length,
                      ),
                    );
                  },
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  String _accessLabel(String type, String Function(String, String) t) {
    switch (type) {
      case 'public': return t('مجاني', 'Free');
      case 'stage': return t('حسب المرحلة', 'By Stage');
      case 'subscription': return t('اشتراك', 'Subscription');
      case 'invite_only': return t('بدعوة', 'Invite Only');
      default: return type;
    }
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.primary),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.primary)),
        ],
      ),
    );
  }
}
