import 'package:flutter/material.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';

class BestsellerBadge extends StatelessWidget {
  final String lang;
  final double fontSize;

  const BestsellerBadge({
    super.key,
    this.lang = 'ar',
    this.fontSize = 11,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.bestsellerBg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        lang == 'ar' ? 'الأكثر مبيعاً' : 'Bestseller',
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w700,
          color: AppColors.bestsellerText,
        ),
      ),
    );
  }
}
