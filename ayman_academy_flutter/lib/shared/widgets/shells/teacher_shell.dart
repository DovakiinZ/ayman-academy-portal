import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/avatar_widget.dart';

class TeacherShell extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const TeacherShell({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(languageProvider);
    final t = ref.read(languageProvider.notifier).t;
    final auth = ref.watch(authProvider);
    final profile = auth.profile;

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        drawer: Drawer(
          child: SafeArea(
            child: Column(
              children: [
                // Header
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.06),
                  ),
                  child: Column(
                    children: [
                      AvatarWidget(
                        name: profile?.fullName ?? '?',
                        imageUrl: profile?.avatarUrl,
                        radius: 32,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        profile?.fullName ?? '',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Text(
                        profile?.email ?? '',
                        style: const TextStyle(color: AppColors.inkMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ),

                // Menu items
                Expanded(
                  child: ListView(
                    padding: EdgeInsets.zero,
                    children: [
                      _DrawerItem(icon: Icons.dashboard, label: t('لوحة التحكم', 'Dashboard'), onTap: () {
                        Navigator.pop(context);
                        navigationShell.goBranch(0);
                      }),
                      _DrawerItem(icon: Icons.receipt_long, label: t('الطلبات', 'Orders'), onTap: () {
                        Navigator.pop(context);
                        context.push(Routes.teacherOrders);
                      }),
                      _DrawerItem(icon: Icons.menu_book, label: t('موادي', 'My Subjects'), onTap: () {
                        Navigator.pop(context);
                        navigationShell.goBranch(1);
                      }),
                      _DrawerItem(icon: Icons.campaign, label: t('الإعلانات', 'Announcements'), onTap: () {
                        Navigator.pop(context);
                        navigationShell.goBranch(2);
                      }),
                      _DrawerItem(icon: Icons.workspace_premium, label: t('الشهادات', 'Certificates'), onTap: () {
                        Navigator.pop(context);
                        context.push(Routes.teacherCertificates);
                      }),
                      _DrawerItem(icon: Icons.chat_bubble, label: t('الرسائل', 'Messages'), onTap: () {
                        Navigator.pop(context);
                        navigationShell.goBranch(3);
                      }),
                      _DrawerItem(icon: Icons.person, label: t('ملفي الشخصي', 'Profile'), onTap: () {
                        Navigator.pop(context);
                        navigationShell.goBranch(4);
                      }),
                      const Divider(),
                      _DrawerItem(icon: Icons.logout, label: t('تسجيل الخروج', 'Sign Out'), color: AppColors.error, onTap: () {
                        ref.read(authProvider.notifier).signOut();
                      }),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        body: navigationShell,
        bottomNavigationBar: NavigationBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: (index) => navigationShell.goBranch(index, initialLocation: index == navigationShell.currentIndex),
          destinations: [
            NavigationDestination(
              icon: const Icon(Icons.dashboard_outlined),
              selectedIcon: const Icon(Icons.dashboard),
              label: t('لوحة التحكم', 'Dashboard'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.menu_book_outlined),
              selectedIcon: const Icon(Icons.menu_book),
              label: t('موادي', 'Subjects'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.campaign_outlined),
              selectedIcon: const Icon(Icons.campaign),
              label: t('الإعلانات', 'Announce'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.chat_bubble_outline),
              selectedIcon: const Icon(Icons.chat_bubble),
              label: t('الرسائل', 'Messages'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.person_outline),
              selectedIcon: const Icon(Icons.person),
              label: t('ملفي', 'Profile'),
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

  const _DrawerItem({required this.icon, required this.label, required this.onTap, this.color});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: color ?? AppColors.primary, size: 22),
      title: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w500)),
      onTap: onTap,
    );
  }
}
