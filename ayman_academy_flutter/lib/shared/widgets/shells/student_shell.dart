import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/avatar_widget.dart';

class StudentShell extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const StudentShell({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(languageProvider);
    final t = ref.read(languageProvider.notifier).t;
    final auth = ref.watch(authProvider);
    final profile = auth.profile;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        drawer: _buildDrawer(context, ref, t, profile, isDark),
        body: navigationShell,
        bottomNavigationBar: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Thin top border — iOS style
            Container(
              height: 0.5,
              color: isDark ? AppColors.borderDark : AppColors.border,
            ),
            NavigationBar(
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: (index) => navigationShell.goBranch(
                index,
                initialLocation: index == navigationShell.currentIndex,
              ),
              destinations: [
                NavigationDestination(
                  icon: const Icon(Icons.star_outline_rounded),
                  selectedIcon: const Icon(Icons.star_rounded),
                  label: t('المميز', 'Featured'),
                ),
                NavigationDestination(
                  icon: const Icon(Icons.play_circle_outline_rounded),
                  selectedIcon: const Icon(Icons.play_circle_rounded),
                  label: t('تعلّمي', 'My learning'),
                ),
                NavigationDestination(
                  icon: const Icon(Icons.workspace_premium_outlined),
                  selectedIcon: const Icon(Icons.workspace_premium),
                  label: t('شهادات', 'Certs'),
                ),
                NavigationDestination(
                  icon: const Icon(Icons.chat_bubble_outline_rounded),
                  selectedIcon: const Icon(Icons.chat_bubble_rounded),
                  label: t('الرسائل', 'Messages'),
                ),
                NavigationDestination(
                  icon: const Icon(Icons.person_outline_rounded),
                  selectedIcon: const Icon(Icons.person_rounded),
                  label: t('حسابي', 'Account'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawer(BuildContext context, WidgetRef ref, Function t, dynamic profile, bool isDark) {
    return Drawer(
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.background,
      child: SafeArea(
        child: Column(
          children: [
            // ── Clean profile header ──
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
              child: Row(
                children: [
                  AvatarWidget(
                    name: profile?.fullName ?? '?',
                    imageUrl: profile?.avatarUrl,
                    radius: 28,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          profile?.fullName ?? '',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          profile?.email ?? '',
                          style: const TextStyle(
                            color: AppColors.inkMuted,
                            fontSize: 13,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(),

            // ── Menu items ──
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 4),
                children: [
                  _DrawerItem(icon: Icons.home_rounded, label: t('الرئيسية', 'Home') as String, onTap: () {
                    Navigator.pop(context);
                    navigationShell.goBranch(0);
                  }),
                  _DrawerItem(icon: Icons.store_rounded, label: t('المتجر', 'Marketplace') as String, onTap: () {
                    Navigator.pop(context);
                    context.push(Routes.marketplace);
                  }),
                  _DrawerItem(icon: Icons.book_rounded, label: t('موادي', 'My Subjects') as String, onTap: () {
                    Navigator.pop(context);
                    navigationShell.goBranch(1);
                  }),
                  _DrawerItem(icon: Icons.explore_rounded, label: t('استكشف', 'Discover') as String, onTap: () {
                    Navigator.pop(context);
                    context.push('/student/discover');
                  }),
                  _DrawerItem(icon: Icons.people_rounded, label: t('المعلمون', 'Teachers') as String, onTap: () {
                    Navigator.pop(context);
                    context.push('/student/teachers');
                  }),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Divider(),
                  ),
                  _DrawerItem(icon: Icons.emoji_events_rounded, label: t('إنجازاتي', 'Achievements') as String, onTap: () {
                    Navigator.pop(context);
                    context.push('/student/achievements');
                  }),
                  _DrawerItem(icon: Icons.workspace_premium_rounded, label: t('شهاداتي', 'Certificates') as String, onTap: () {
                    Navigator.pop(context);
                    navigationShell.goBranch(2);
                  }),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Divider(),
                  ),
                  _DrawerItem(
                    icon: Icons.logout_rounded,
                    label: t('تسجيل الخروج', 'Sign Out') as String,
                    color: AppColors.error,
                    onTap: () => ref.read(authProvider.notifier).signOut(),
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

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultColor = isDark ? AppColors.inkDark : AppColors.ink;

    return ListTile(
      dense: true,
      leading: Icon(icon, color: color ?? defaultColor, size: 22),
      title: Text(
        label,
        style: TextStyle(
          color: color ?? defaultColor,
          fontWeight: FontWeight.w500,
          fontSize: 15,
        ),
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      onTap: onTap,
    );
  }
}
