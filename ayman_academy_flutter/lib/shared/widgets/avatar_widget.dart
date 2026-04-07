import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';

class AvatarWidget extends StatelessWidget {
  final String? imageUrl;
  final String name;
  final double radius;

  const AvatarWidget({
    super.key,
    this.imageUrl,
    required this.name,
    this.radius = 20,
  });

  @override
  Widget build(BuildContext context) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final hasImage = imageUrl != null && imageUrl!.isNotEmpty && imageUrl!.startsWith('http');

    if (hasImage) {
      return CircleAvatar(
        radius: radius,
        backgroundColor: AppColors.primary.withValues(alpha: 0.1),
        child: ClipOval(
          child: CachedNetworkImage(
            imageUrl: imageUrl!,
            width: radius * 2,
            height: radius * 2,
            fit: BoxFit.cover,
            placeholder: (_, _) => Center(
              child: Text(
                initial,
                style: TextStyle(fontSize: radius * 0.8, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
            ),
            errorWidget: (_, _, _) => Center(
              child: Text(
                initial,
                style: TextStyle(fontSize: radius * 0.8, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
            ),
          ),
        ),
      );
    }

    return CircleAvatar(
      radius: radius,
      backgroundColor: AppColors.primary.withValues(alpha: 0.1),
      child: Text(
        initial,
        style: TextStyle(
          fontSize: radius * 0.8,
          fontWeight: FontWeight.bold,
          color: AppColors.primary,
        ),
      ),
    );
  }
}
