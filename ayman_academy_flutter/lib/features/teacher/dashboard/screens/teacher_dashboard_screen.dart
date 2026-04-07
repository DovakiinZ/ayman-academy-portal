import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/providers/theme_provider.dart';

final _teacherStatsProvider = FutureProvider<Map<String, int>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return {};
  final subjects = await supabase
      .from('subjects')
      .select('id')
      .eq('teacher_id', userId);
  final subjectIds = (subjects as List).map((e) => e['id'] as String).toList();
  int lessonCount = 0;
  if (subjectIds.isNotEmpty) {
    final lessons = await supabase
        .from('lessons')
        .select('id')
        .inFilter('subject_id', subjectIds);
    lessonCount = (lessons as List).length;
  }
  return {
    'subjects': subjectIds.length,
    'lessons': lessonCount,
  };
});

class TeacherDashboardScreen extends ConsumerWidget {
  const TeacherDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final statsAsync = ref.watch(_teacherStatsProvider);

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
            title: Text(t('لوحة التحكم', 'Dashboard')),
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
                Text(
                  t('مرحباً، ${auth.profile?.fullName ?? "معلم"}!', 'Hello, ${auth.profile?.fullName ?? "Teacher"}!'),
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  t('إدارة موادك ومتابعة طلابك', 'Manage your subjects and track students'),
                  style: const TextStyle(color: AppColors.inkMuted),
                ),
                const SizedBox(height: 24),
                statsAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Text('$e'),
                  data: (stats) => Row(
                    children: [
                      Expanded(child: _StatCard(
                        icon: Icons.menu_book,
                        value: '${stats['subjects'] ?? 0}',
                        label: t('المواد', 'Subjects'),
                        color: AppColors.primary,
                      )),
                      const SizedBox(width: 12),
                      Expanded(child: _StatCard(
                        icon: Icons.article,
                        value: '${stats['lessons'] ?? 0}',
                        label: t('الدروس', 'Lessons'),
                        color: AppColors.gold,
                      )),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                // ShamCash warning
                if (auth.profile?.shamcashAccountNumber == null || (auth.profile?.shamcashAccountNumber ?? '').isEmpty)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber, color: AppColors.warning),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            t('أضف بيانات ShamCash لتفعيل بيع الكورسات', 'Add ShamCash info to enable course sales'),
                            style: const TextStyle(color: AppColors.warning, fontSize: 13),
                          ),
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
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  const _StatCard({required this.icon, required this.value, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, size: 28, color: color),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(fontSize: 12, color: color)),
        ],
      ),
    );
  }
}
