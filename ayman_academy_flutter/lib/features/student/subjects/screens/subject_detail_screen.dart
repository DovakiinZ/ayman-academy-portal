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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        body: subjectAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (subject) {
            if (subject == null) return Center(child: Text(t('المادة غير موجودة', 'Subject not found')));

            // Extract teacher info from the join
            final teacherData = subject.teacherName;

            return Stack(
              children: [
                CustomScrollView(
                  slivers: [
                    // Hero image
                    SliverAppBar(
                      expandedHeight: 220,
                      pinned: true,
                      flexibleSpace: FlexibleSpaceBar(
                        background: Stack(
                          fit: StackFit.expand,
                          children: [
                            if (subject.coverImageUrl != null && subject.coverImageUrl!.isNotEmpty)
                              CachedNetworkImage(
                                imageUrl: subject.coverImageUrl!,
                                fit: BoxFit.cover,
                                errorWidget: (_, __, ___) => _gradientCover(),
                              )
                            else
                              _gradientCover(),
                            // Dark overlay
                            Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [Colors.black.withValues(alpha: 0.1), Colors.black.withValues(alpha: 0.6)],
                                ),
                              ),
                            ),
                            // Price badge
                            if (subject.isPaid == true)
                              Positioned(
                                top: 80,
                                left: 16,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: AppColors.gold,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    '${subject.priceAmount?.toInt() ?? 0} ${subject.priceCurrency ?? "SYP"}',
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),

                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Title
                            Text(
                              subject.title(lang),
                              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, height: 1.3),
                            ),
                            const SizedBox(height: 12),

                            // Teacher row
                            if (teacherData != null)
                              Row(
                                children: [
                                  const Icon(Icons.person, size: 16, color: AppColors.inkMuted),
                                  const SizedBox(width: 6),
                                  Text(teacherData, style: const TextStyle(fontSize: 14, color: AppColors.inkMuted)),
                                ],
                              ),
                            const SizedBox(height: 16),

                            // Stats row
                            Row(
                              children: [
                                _StatPill(
                                  icon: Icons.article,
                                  label: lessonsAsync.when(
                                    data: (l) => '${l.length} ${t("درس", "lessons")}',
                                    loading: () => '...',
                                    error: (_, __) => '-',
                                  ),
                                ),
                                const SizedBox(width: 8),
                                if (subject.stage != null)
                                  _StatPill(icon: Icons.school, label: subject.stage!.title(lang)),
                                const SizedBox(width: 8),
                                _StatPill(
                                  icon: subject.isPaid == true ? Icons.paid : Icons.lock_open,
                                  label: subject.isPaid == true ? t('مدفوع', 'Paid') : t('مجاني', 'Free'),
                                ),
                              ],
                            ),

                            // Description
                            if (subject.description(lang).isNotEmpty) ...[
                              const SizedBox(height: 24),
                              Text(
                                t('عن هذه المادة', 'About this course'),
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                subject.description(lang),
                                style: TextStyle(fontSize: 14, height: 1.7, color: AppColors.inkMuted),
                              ),
                            ],

                            // Curriculum header
                            const SizedBox(height: 24),
                            Row(
                              children: [
                                Text(
                                  t('المنهج الدراسي', 'Course Curriculum'),
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                ),
                                const Spacer(),
                                lessonsAsync.when(
                                  data: (l) => Text('${l.length} ${t("درس", "lessons")}', style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
                                  loading: () => const SizedBox.shrink(),
                                  error: (_, __) => const SizedBox.shrink(),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
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
                                child: Column(
                                  children: [
                                    const Icon(Icons.article, size: 48, color: AppColors.inkMuted),
                                    const SizedBox(height: 12),
                                    Text(t('لا توجد دروس بعد', 'No lessons yet'), style: const TextStyle(color: AppColors.inkMuted)),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }
                        return SliverPadding(
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final lesson = lessons[index];
                                final progress = progressMap[lesson.id] ?? 0;
                                final isCompleted = progress >= 100;

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 10),
                                  decoration: BoxDecoration(
                                    color: isDark ? AppColors.surfaceDark : Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.04), blurRadius: 8, offset: const Offset(0, 2))],
                                  ),
                                  child: Material(
                                    color: Colors.transparent,
                                    child: InkWell(
                                      borderRadius: BorderRadius.circular(12),
                                      onTap: () => context.push('/student/subjects/subject/$subjectId/lesson/${lesson.id}'),
                                      child: Padding(
                                        padding: const EdgeInsets.all(14),
                                        child: Row(
                                          children: [
                                            // Number/check circle
                                            Container(
                                              width: 40,
                                              height: 40,
                                              decoration: BoxDecoration(
                                                color: isCompleted
                                                    ? AppColors.success.withValues(alpha: 0.1)
                                                    : progress > 0
                                                        ? AppColors.primary.withValues(alpha: 0.1)
                                                        : (isDark ? AppColors.borderDark : AppColors.secondary),
                                                shape: BoxShape.circle,
                                              ),
                                              child: Center(
                                                child: isCompleted
                                                    ? const Icon(Icons.check, color: AppColors.success, size: 20)
                                                    : Text(
                                                        '${index + 1}',
                                                        style: TextStyle(
                                                          fontWeight: FontWeight.w600,
                                                          fontSize: 15,
                                                          color: progress > 0 ? AppColors.primary : AppColors.inkMuted,
                                                        ),
                                                      ),
                                              ),
                                            ),
                                            const SizedBox(width: 14),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    lesson.title(lang),
                                                    style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                                                  ),
                                                  const SizedBox(height: 4),
                                                  Row(
                                                    children: [
                                                      if (lesson.durationMinutes != null) ...[
                                                        Icon(Icons.access_time, size: 13, color: AppColors.inkMuted),
                                                        const SizedBox(width: 3),
                                                        Text('${lesson.durationMinutes} ${t("د", "min")}', style: const TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                                                        const SizedBox(width: 10),
                                                      ],
                                                      if (progress > 0 && !isCompleted)
                                                        Container(
                                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                                          decoration: BoxDecoration(
                                                            color: AppColors.primary.withValues(alpha: 0.08),
                                                            borderRadius: BorderRadius.circular(4),
                                                          ),
                                                          child: Text('$progress%', style: const TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w600)),
                                                        ),
                                                    ],
                                                  ),
                                                ],
                                              ),
                                            ),
                                            Icon(
                                              lesson.isPaid ? Icons.lock : Icons.play_circle_outline,
                                              size: 22,
                                              color: lesson.isPaid ? AppColors.inkMuted : AppColors.primary,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              },
                              childCount: lessons.length,
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),

                // Sticky bottom CTA
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : Colors.white,
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 12, offset: const Offset(0, -4))],
                    ),
                    child: SafeArea(
                      top: false,
                      child: Container(
                        height: 50,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryLight]),
                        ),
                        child: ElevatedButton(
                          onPressed: () {
                            if (subject.isPaid == true) {
                              context.push('/student/marketplace/checkout/$subjectId');
                            } else {
                              context.push('/student/subjects/subject/$subjectId');
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: Text(
                            subject.isPaid == true
                                ? t('اشترِ الآن - ${subject.priceAmount?.toInt() ?? 0} ${subject.priceCurrency ?? "SYP"}', 'Buy Now - ${subject.priceAmount?.toInt() ?? 0} ${subject.priceCurrency ?? "SYP"}')
                                : t('ابدأ التعلم', 'Start Learning'),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _gradientCover() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primaryLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Center(child: Icon(Icons.menu_book, size: 60, color: Colors.white24)),
    );
  }
}

class _StatPill extends StatelessWidget {
  final IconData icon;
  final String label;

  const _StatPill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.1)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.primary),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
