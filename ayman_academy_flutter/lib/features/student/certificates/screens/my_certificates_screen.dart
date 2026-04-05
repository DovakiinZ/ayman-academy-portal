import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/certificates/providers/certificates_provider.dart';

class MyCertificatesScreen extends ConsumerWidget {
  const MyCertificatesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final certsAsync = ref.watch(myCertificatesProvider);

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(title: Text(t('شهاداتي', 'My Certificates'))),
        body: certsAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (certs) {
            if (certs.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.workspace_premium, size: 64, color: AppColors.inkMuted),
                    const SizedBox(height: 16),
                    Text(t('لا توجد شهادات بعد', 'No certificates yet'), style: const TextStyle(color: AppColors.inkMuted, fontSize: 16)),
                    const SizedBox(height: 8),
                    Text(t('أكمل المواد للحصول على شهادات', 'Complete subjects to earn certificates'), style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(myCertificatesProvider),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: certs.length,
                itemBuilder: (context, index) {
                  final c = certs[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(16),
                      leading: Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(
                          color: (c.status == 'issued' ? AppColors.success : AppColors.warning).withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          c.status == 'issued' ? Icons.verified : Icons.pending,
                          color: c.status == 'issued' ? AppColors.success : AppColors.warning,
                        ),
                      ),
                      title: Text(c.courseName, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: (c.status == 'issued' ? AppColors.success : AppColors.warning).withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              c.status == 'issued' ? t('صادرة', 'Issued') : t('قيد المراجعة', 'Pending'),
                              style: TextStyle(fontSize: 11, color: c.status == 'issued' ? AppColors.success : AppColors.warning),
                            ),
                          ),
                          if (c.score != null) ...[
                            const SizedBox(height: 4),
                            Text('${t("الدرجة", "Score")}: ${c.score!.toInt()}%', style: const TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                          ],
                        ],
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/student/certificates/${c.id}'),
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
