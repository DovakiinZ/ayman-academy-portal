import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/subject.dart';
import 'package:ayman_academy_app/shared/widgets/star_rating.dart';
import 'package:ayman_academy_app/shared/widgets/bestseller_badge.dart';

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
          color: isDark ? AppColors.surfaceDark : AppColors.surface,
          borderRadius: BorderRadius.circular(4),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Cover Image (no overlay, clean) ──
            _buildCover(),

            // ── Content ──
            Padding(
              padding: const EdgeInsets.fromLTRB(0, 10, 0, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title — bold, prominent
                  Text(
                    subject.title(lang),
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      height: 1.3,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),

                  // Teacher name — subtle
                  if (subject.teacherName != null) ...[
                    const SizedBox(height: 3),
                    Text(
                      subject.teacherName!,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.inkMuted,
                        height: 1.2,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],

                  // Star rating
                  const SizedBox(height: 4),
                  StarRating(
                    rating: subject.averageRating ?? 4.5,
                    reviewCount: subject.ratingCount ?? 0,
                    starSize: 12,
                    compact: true,
                  ),

                  // Price
                  const SizedBox(height: 5),
                  _buildPrice(),

                  // Bestseller badge
                  if ((subject.ratingCount ?? 0) > 10) ...[
                    const SizedBox(height: 5),
                    BestsellerBadge(lang: lang, fontSize: 10),
                  ],

                  // Progress bar (for enrolled courses)
                  if (showProgress && subject.progressPercent != null) ...[
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(2),
                      child: LinearProgressIndicator(
                        value: subject.progressPercent! / 100,
                        backgroundColor: isDark
                            ? AppColors.borderDark
                            : AppColors.border,
                        valueColor: AlwaysStoppedAnimation(
                          subject.progressPercent! >= 100
                              ? AppColors.success
                              : AppColors.accent,
                        ),
                        minHeight: 4,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${subject.progressPercent!.toInt()}% ${lang == "ar" ? "مكتمل" : "complete"}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.inkMuted,
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

  Widget _buildPrice() {
    if (subject.isPaid == true) {
      return Text(
        '${subject.priceCurrency ?? "SYP"} ${subject.priceAmount?.toStringAsFixed(2) ?? "0.00"}',
        style: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w800,
          color: AppColors.ink,
        ),
      );
    }
    return Text(
      lang == 'ar' ? 'مجاني' : 'Free',
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w800,
        color: AppColors.ink,
      ),
    );
  }

  Widget _buildCover() {
    if (subject.coverImageUrl != null && subject.coverImageUrl!.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: subject.coverImageUrl!,
        height: 130,
        width: double.infinity,
        fit: BoxFit.cover,
        placeholder: (_, _) => _placeholderCover(),
        errorWidget: (_, _, _) => _placeholderCover(),
      );
    }
    return _placeholderCover();
  }

  Widget _placeholderCover() {
    return Container(
      height: 130,
      width: double.infinity,
      color: AppColors.secondary,
      child: const Center(
        child: Icon(Icons.play_circle_outline, size: 40, color: AppColors.inkMuted),
      ),
    );
  }
}
