import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/subject.dart';

class SubjectCard extends StatelessWidget {
  final Subject subject;
  final String lang;
  final VoidCallback? onTap;
  final bool showProgress;

  const SubjectCard({
    super.key,
    required this.subject,
    required this.lang,
    this.onTap,
    this.showProgress = false,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cover image
            if (subject.coverImageUrl != null && subject.coverImageUrl!.isNotEmpty)
              CachedNetworkImage(
                imageUrl: subject.coverImageUrl!,
                height: 120,
                width: double.infinity,
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(
                  height: 120,
                  color: AppColors.primary.withValues(alpha: 0.1),
                  child: const Center(child: Icon(Icons.menu_book, size: 40, color: AppColors.primary)),
                ),
                errorWidget: (_, __, ___) => Container(
                  height: 120,
                  color: AppColors.primary.withValues(alpha: 0.1),
                  child: const Center(child: Icon(Icons.menu_book, size: 40, color: AppColors.primary)),
                ),
              )
            else
              Container(
                height: 120,
                color: AppColors.primary.withValues(alpha: 0.1),
                child: const Center(child: Icon(Icons.menu_book, size: 40, color: AppColors.primary)),
              ),

            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    subject.title(lang),
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (subject.teacherName != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      subject.teacherName!,
                      style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                    ),
                  ],
                  if (showProgress && subject.progressPercent != null) ...[
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: subject.progressPercent! / 100,
                        backgroundColor: AppColors.border,
                        valueColor: const AlwaysStoppedAnimation(AppColors.success),
                        minHeight: 6,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text('${subject.progressPercent}%', style: const TextStyle(fontSize: 11, color: AppColors.inkMuted)),
                  ],
                  if (subject.isPaid == true) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.gold.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${subject.priceAmount?.toInt() ?? 0} ${subject.priceCurrency ?? "SYP"}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.gold),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
