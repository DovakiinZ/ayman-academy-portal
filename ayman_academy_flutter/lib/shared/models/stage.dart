class Stage {
  final String id;
  final String slug;
  final String titleAr;
  final String? titleEn;
  final String? descriptionAr;
  final int sortOrder;
  final bool isActive;

  const Stage({
    required this.id,
    required this.slug,
    required this.titleAr,
    this.titleEn,
    this.descriptionAr,
    this.sortOrder = 0,
    this.isActive = true,
  });

  factory Stage.fromJson(Map<String, dynamic> json) => Stage(
    id: json['id'] as String? ?? '',
    slug: json['slug'] as String? ?? '',
    titleAr: json['title_ar'] as String? ?? '',
    titleEn: json['title_en'] as String?,
    descriptionAr: json['description_ar'] as String?,
    sortOrder: json['sort_order'] as int? ?? 0,
    isActive: json['is_active'] as bool? ?? true,
  );

  String title(String lang) =>
      lang == 'ar' ? titleAr : (titleEn ?? titleAr);
}
