import 'package:flutter/material.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';

class StarRating extends StatelessWidget {
  final double rating;
  final int? reviewCount;
  final double starSize;
  final bool showCount;
  final bool compact;

  const StarRating({
    super.key,
    required this.rating,
    this.reviewCount,
    this.starSize = 14,
    this.showCount = true,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Rating number
        Text(
          rating.toStringAsFixed(1),
          style: TextStyle(
            fontSize: compact ? 11 : 13,
            fontWeight: FontWeight.w700,
            color: AppColors.starFilled,
          ),
        ),
        const SizedBox(width: 3),
        // Stars
        ...List.generate(5, (i) {
          final diff = rating - i;
          IconData icon;
          if (diff >= 0.75) {
            icon = Icons.star_rounded;
          } else if (diff >= 0.25) {
            icon = Icons.star_half_rounded;
          } else {
            icon = Icons.star_outline_rounded;
          }
          return Icon(icon, size: starSize, color: AppColors.starFilled);
        }),
        // Review count
        if (showCount && reviewCount != null) ...[
          const SizedBox(width: 4),
          Text(
            '(${_formatCount(reviewCount!)})',
            style: TextStyle(
              fontSize: compact ? 10 : 12,
              color: AppColors.inkMuted,
            ),
          ),
        ],
      ],
    );
  }

  String _formatCount(int count) {
    if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}k';
    }
    return count.toString();
  }
}
