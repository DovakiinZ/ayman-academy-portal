import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/models/subject.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/providers/theme_provider.dart';
import 'package:ayman_academy_app/shared/widgets/xp_progress_bar.dart';
import 'package:ayman_academy_app/shared/widgets/avatar_widget.dart';
import 'package:ayman_academy_app/features/student/subjects/providers/subjects_provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

class StudentDashboardScreen extends ConsumerWidget {
  const StudentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final mySubjects = ref.watch(mySubjectsProvider);
    final discoverSubjects = ref.watch(discoverSubjectsProvider);
    final profile = auth.profile;

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: CustomScrollView(
        slivers: [
          // App bar
          SliverAppBar(
            floating: true,
            leading: IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
            title: Row(
              children: [
                Text(
                  t('أكاديمية أيمن', 'Ayman Academy'),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: Icon(ref.watch(themeProvider) == ThemeMode.dark ? Icons.light_mode : Icons.dark_mode, size: 22),
                onPressed: () => ref.read(themeProvider.notifier).toggle(),
              ),
              IconButton(
                icon: const Icon(Icons.language, size: 22),
                onPressed: () => ref.read(languageProvider.notifier).toggle(),
              ),
            ],
          ),

          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Greeting header
                Container(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: isDark
                          ? [AppColors.surfaceDark, AppColors.backgroundDark]
                          : [AppColors.primary.withValues(alpha: 0.06), AppColors.background],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                  child: Row(
                    children: [
                      AvatarWidget(
                        name: profile?.fullName ?? '?',
                        imageUrl: profile?.avatarUrl,
                        radius: 26,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              t('مرحباً، ${profile?.fullName ?? ""}', 'Hi, ${profile?.fullName ?? ""}'),
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              t('واصل رحلة التعلم', 'Continue your learning journey'),
                              style: TextStyle(color: AppColors.inkMuted, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                      // XP compact badge
                      const XPProgressBar(compact: true),
                    ],
                  ),
                ),

                // Continue Learning section
                mySubjects.when(
                  loading: () => const SizedBox(height: 180, child: Center(child: CircularProgressIndicator())),
                  error: (_, __) => const SizedBox.shrink(),
                  data: (subjects) {
                    if (subjects.isEmpty) return const SizedBox.shrink();
                    final inProgress = subjects.where((s) => s.progressPercent != null && s.progressPercent! > 0 && s.progressPercent! < 100).toList();
                    if (inProgress.isEmpty) return const SizedBox.shrink();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                          child: Text(
                            t('متابعة التعلم', 'Continue Learning'),
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                        ),
                        SizedBox(
                          height: 160,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            itemCount: inProgress.length,
                            separatorBuilder: (_, __) => const SizedBox(width: 14),
                            itemBuilder: (context, index) {
                              final s = inProgress[index];
                              return _ContinueLearningCard(
                                subject: s,
                                lang: lang.languageCode,
                                onTap: () => context.push('/student/subjects/subject/${s.id}'),
                              );
                            },
                          ),
                        ),
                      ],
                    );
                  },
                ),

                // Quick Actions
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                  child: Text(
                    t('الوصول السريع', 'Quick Access'),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      _QuickAction(
                        icon: Icons.store,
                        label: t('المتجر', 'Market'),
                        color: AppColors.gold,
                        onTap: () => context.push(Routes.marketplace),
                      ),
                      const SizedBox(width: 10),
                      _QuickAction(
                        icon: Icons.explore,
                        label: t('اكتشف', 'Discover'),
                        color: AppColors.info,
                        onTap: () => context.push('/student/discover'),
                      ),
                      const SizedBox(width: 10),
                      _QuickAction(
                        icon: Icons.emoji_events,
                        label: t('إنجازاتي', 'Achieve'),
                        color: AppColors.success,
                        onTap: () => context.push('/student/achievements'),
                      ),
                      const SizedBox(width: 10),
                      _QuickAction(
                        icon: Icons.people,
                        label: t('المعلمون', 'Teachers'),
                        color: AppColors.primary,
                        onTap: () => context.push('/student/teachers'),
                      ),
                    ],
                  ),
                ),

                // Discover section
                discoverSubjects.when(
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                  data: (subjects) {
                    if (subjects.isEmpty) return const SizedBox.shrink();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 28, 20, 12),
                          child: Row(
                            children: [
                              Text(
                                t('مواد مقترحة', 'Recommended'),
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                              const Spacer(),
                              TextButton(
                                onPressed: () => context.push('/student/discover'),
                                child: Text(t('عرض الكل', 'See All'), style: const TextStyle(fontSize: 13)),
                              ),
                            ],
                          ),
                        ),
                        SizedBox(
                          height: 220,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            itemCount: subjects.take(6).length,
                            separatorBuilder: (_, __) => const SizedBox(width: 14),
                            itemBuilder: (context, index) {
                              final s = subjects[index];
                              return _DiscoverCard(
                                subject: s,
                                lang: lang.languageCode,
                                isDark: isDark,
                                onTap: () => context.push('/student/subjects/subject/${s.id}'),
                              );
                            },
                          ),
                        ),
                      ],
                    );
                  },
                ),

                const SizedBox(height: 32),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Continue Learning Card — horizontal
class _ContinueLearningCard extends StatelessWidget {
  final Subject subject;
  final String lang;
  final VoidCallback onTap;

  const _ContinueLearningCard({required this.subject, required this.lang, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final progress = subject.progressPercent ?? 0;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 280,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.06), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryLight]),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(child: Icon(Icons.menu_book, color: Colors.white, size: 22)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(subject.title(lang), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
                      if (subject.teacherName != null)
                        Text(subject.teacherName!, style: const TextStyle(fontSize: 11, color: AppColors.inkMuted)),
                    ],
                  ),
                ),
              ],
            ),
            const Spacer(),
            // Progress
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: progress / 100,
                      backgroundColor: isDark ? AppColors.borderDark : AppColors.secondary,
                      valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                      minHeight: 6,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Text('$progress%', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.primary)),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                lang == 'ar' ? 'متابعة' : 'Continue',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Quick Action chip
class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickAction({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withValues(alpha: 0.15)),
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 6),
              Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
            ],
          ),
        ),
      ),
    );
  }
}

// Discover/Recommended Card
class _DiscoverCard extends StatelessWidget {
  final Subject subject;
  final String lang;
  final bool isDark;
  final VoidCallback onTap;

  const _DiscoverCard({required this.subject, required this.lang, required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 170,
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05), blurRadius: 10, offset: const Offset(0, 3))],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cover
            Container(
              height: 100,
              width: double.infinity,
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [AppColors.primary, AppColors.primaryLight], begin: Alignment.topLeft, end: Alignment.bottomRight),
              ),
              child: subject.coverImageUrl != null && subject.coverImageUrl!.isNotEmpty
                  ? CachedNetworkImage(imageUrl: subject.coverImageUrl!, fit: BoxFit.cover, errorWidget: (_, __, ___) => const Center(child: Icon(Icons.menu_book, color: Colors.white30, size: 32)))
                  : const Center(child: Icon(Icons.menu_book, color: Colors.white30, size: 32)),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    subject.title(lang),
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, height: 1.3),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  if (subject.teacherName != null)
                    Text(subject.teacherName!, style: const TextStyle(fontSize: 11, color: AppColors.inkMuted), maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  if (subject.isPaid == true)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.gold.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                      child: Text('${subject.priceAmount?.toInt() ?? 0} ${subject.priceCurrency ?? "SYP"}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.gold)),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                      child: Text(lang == 'ar' ? 'مجاني' : 'Free', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.success)),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
