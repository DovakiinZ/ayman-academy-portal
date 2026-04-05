class LessonBlock {
  final String id;
  final String lessonId;
  final String? sectionId;
  final String type;
  final String? titleAr;
  final String? titleEn;
  final String? contentAr;
  final String? contentEn;
  final String? url;
  final int sortOrder;
  final bool isPublished;

  const LessonBlock({
    required this.id,
    required this.lessonId,
    this.sectionId,
    required this.type,
    this.titleAr,
    this.titleEn,
    this.contentAr,
    this.contentEn,
    this.url,
    this.sortOrder = 0,
    this.isPublished = true,
  });

  factory LessonBlock.fromJson(Map<String, dynamic> json) => LessonBlock(
    id: json['id'] as String? ?? '',
    lessonId: json['lesson_id'] as String? ?? '',
    sectionId: json['section_id'] as String?,
    type: json['type'] as String? ?? 'rich_text',
    titleAr: json['title_ar'] as String?,
    titleEn: json['title_en'] as String?,
    contentAr: json['content_ar'] as String?,
    contentEn: json['content_en'] as String?,
    url: json['url'] as String?,
    sortOrder: json['sort_order'] as int? ?? 0,
    isPublished: json['is_published'] as bool? ?? true,
  );

  String content(String lang) =>
      lang == 'ar' ? (contentAr ?? '') : (contentEn ?? contentAr ?? '');
  String title(String lang) =>
      lang == 'ar' ? (titleAr ?? '') : (titleEn ?? titleAr ?? '');
}
