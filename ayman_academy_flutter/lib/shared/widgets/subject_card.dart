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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.06),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cover image with gradient overlay
            Stack(
              children: [
                if (subject.coverImageUrl != null && subject.coverImageUrl!.isNotEmpty)
                  CachedNetworkImage(
                    imageUrl: subject.coverImageUrl!,
                    height: 110,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    placeholder: (_, _) => _placeholderCover(),
                    errorWidget: (_, _, _) => _placeholderCover(),
                  )
                else
                  _placeholderCover(),

                // Gradient overlay at bottom
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    height: 40,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black.withValues(alpha: 0.4)],
                      ),
                    ),
                  ),
                ),

                // Price badge
                if (subject.isPaid == true)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.gold,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 4)],
                      ),
                      child: Text(
                        '${subject.priceAmount?.toInt() ?? 0} ${subject.priceCurrency ?? "SYP"}',
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ),

                // Free badge
                if (subject.isPaid != true)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.success,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        lang == 'ar' ? 'مجاني' : 'Free',
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ),
              ],
            ),

            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    subject.title(lang),
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, height: 1.3),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (subject.teacherName != null) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(Icons.person, size: 12, color: AppColors.inkMuted),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            subject.teacherName!,
                            style: const TextStyle(fontSize: 11, color: AppColors.inkMuted),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (showProgress && subject.progressPercent != null) ...[
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: subject.progressPercent! / 100,
                        backgroundColor: isDark ? AppColors.borderDark : AppColors.secondary,
                        valueColor: AlwaysStoppedAnimation(
                          subject.progressPercent! >= 100 ? AppColors.success : AppColors.primary,
                        ),
                        minHeight: 6,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${subject.progressPercent}%',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: subject.progressPercent! >= 100 ? AppColors.success : AppColors.primary,
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

  Widget _placeholderCover() {
    return Container(
      height: 110,
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primaryLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Center(
        child: Icon(Icons.menu_book, size: 36, color: Colors.white38),
      ),
    );
  }
}
