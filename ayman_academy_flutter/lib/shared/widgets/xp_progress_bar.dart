import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/features/student/profile/providers/profile_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

class XPProgressBar extends ConsumerWidget {
  final bool compact;
  const XPProgressBar({super.key, this.compact = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final levelAsync = ref.watch(studentLevelProvider);
    final t = ref.read(languageProvider.notifier).t;

    return levelAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (level) {
        if (level == null) return const SizedBox.shrink();

        if (compact) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFFFFF7ED), Color(0xFFFFF3E0)]),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFFBBF24).withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(level.icon, style: const TextStyle(fontSize: 18)),
                const SizedBox(width: 6),
                Text(level.nameAr, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF78350F), fontSize: 12)),
                const SizedBox(width: 6),
                Text('${level.totalXp} XP', style: const TextStyle(color: Color(0xFF92400E), fontSize: 11)),
              ],
            ),
          );
        }

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFFFFF7ED), Color(0xFFFFF3E0), Color(0xFFFFFBEB)]),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFFBBF24).withValues(alpha: 0.3)),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Text(level.icon, style: const TextStyle(fontSize: 28)),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(level.nameAr, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF78350F))),
                      Text('${level.totalXp} XP', style: const TextStyle(color: Color(0xFF92400E), fontSize: 12)),
                    ],
                  ),
                  const Spacer(),
                  if (level.streakDays > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFCA5A5)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('🔥'),
                          const SizedBox(width: 4),
                          Text('${level.streakDays}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFDC2626))),
                        ],
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              if (level.xpToNextLevel > 0) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: level.progressToNext,
                    backgroundColor: const Color(0xFFFED7AA),
                    valueColor: const AlwaysStoppedAnimation(Color(0xFFF97316)),
                    minHeight: 10,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  t('باقي ${level.xpToNextLevel} نقطة للمستوى التالي', '${level.xpToNextLevel} XP to next level'),
                  style: const TextStyle(fontSize: 11, color: Color(0xFF92400E)),
                  textAlign: TextAlign.center,
                ),
              ] else
                Text(
                  t('وصلت لأعلى مستوى!', 'Max level reached!'),
                  style: const TextStyle(color: Color(0xFF78350F), fontWeight: FontWeight.w600),
                ),
            ],
          ),
        );
      },
    );
  }
}
