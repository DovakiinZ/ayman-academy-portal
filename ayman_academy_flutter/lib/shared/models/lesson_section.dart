class LessonSection {
  final String id;
  final String lessonId;
  final String titleAr;
  final String? titleEn;
  final int sortOrder;

  const LessonSection({
    required this.id,
    required this.lessonId,
    required this.titleAr,
    this.titleEn,
    this.sortOrder = 0,
  });

  factory LessonSection.fromJson(Map<String, dynamic> json) => LessonSection(
    id: json['id'] as String? ?? '',
    lessonId: json['lesson_id'] as String? ?? '',
    titleAr: json['title_ar'] as String? ?? '',
    titleEn: json['title_en'] as String?,
    sortOrder: json['sort_order'] as int? ?? 0,
  );

  String title(String lang) => lang == 'ar' ? titleAr : (titleEn ?? titleAr);
}
