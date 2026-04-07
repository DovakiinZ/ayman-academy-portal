import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/providers/theme_provider.dart';
import 'package:ayman_academy_app/shared/widgets/xp_progress_bar.dart';

class StudentDashboardScreen extends ConsumerWidget {
  const StudentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating: true,
            leading: IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
            title: Text(t('أكاديمية أيمن', 'Ayman Academy')),
            actions: [
              IconButton(
                icon: Icon(ref.watch(themeProvider) == ThemeMode.dark ? Icons.light_mode : Icons.dark_mode),
                onPressed: () => ref.read(themeProvider.notifier).toggle(),
              ),
              IconButton(
                icon: const Icon(Icons.language),
                onPressed: () => ref.read(languageProvider.notifier).toggle(),
              ),
            ],
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Greeting
                Text(
                  t('مرحباً، ${auth.profile?.fullName ?? "طالب"}!', 'Hello, ${auth.profile?.fullName ?? "Student"}!'),
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  t('واصل رحلة التعلم', 'Continue your learning journey'),
                  style: const TextStyle(color: AppColors.inkMuted),
                ),
                const SizedBox(height: 16),

                // XP Progress Bar
                const XPProgressBar(),
                const SizedBox(height: 16),

                // Quick actions
                Row(
                  children: [
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.menu_book,
                        label: t('موادي', 'My Subjects'),
                        color: AppColors.primary,
                        onTap: () => context.go(Routes.mySubjects),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.store,
                        label: t('المتجر', 'Marketplace'),
                        color: AppColors.gold,
                        onTap: () => context.go(Routes.marketplace),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.workspace_premium,
                        label: t('شهاداتي', 'Certificates'),
                        color: AppColors.success,
                        onTap: () => context.go(Routes.certificates),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.chat_bubble,
                        label: t('الرسائل', 'Messages'),
                        color: AppColors.info,
                        onTap: () => context.go(Routes.studentMessages),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Stage info
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.school, color: AppColors.primary),
                      const SizedBox(width: 12),
                      Text(
                        t('المرحلة: ${_stageNameAr(auth.profile?.studentStage)}', 'Stage: ${_stageNameEn(auth.profile?.studentStage)}'),
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  static String _stageNameAr(String? stage) {
    switch (stage) {
      case 'kindergarten': return 'رياض الأطفال';
      case 'primary': return 'ابتدائي';
      case 'middle': return 'إعدادي';
      case 'high': return 'ثانوي';
      default: return 'غير محدد';
    }
  }

  static String _stageNameEn(String? stage) {
    switch (stage) {
      case 'kindergarten': return 'Kindergarten';
      case 'primary': return 'Primary';
      case 'middle': return 'Middle';
      case 'high': return 'High School';
      default: return 'Not set';
    }
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionCard({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(fontWeight: FontWeight.w500, color: color, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}
