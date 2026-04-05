class Announcement {
  final String id;
  final String teacherId;
  final String? subjectId;
  final String titleAr;
  final String? titleEn;
  final String? bodyAr;
  final String? bodyEn;
  final bool isActive;
  final String createdAt;

  const Announcement({
    required this.id,
    required this.teacherId,
    this.subjectId,
    required this.titleAr,
    this.titleEn,
    this.bodyAr,
    this.bodyEn,
    this.isActive = true,
    required this.createdAt,
  });

  factory Announcement.fromJson(Map<String, dynamic> json) => Announcement(
    id: json['id'] as String? ?? '',
    teacherId: json['teacher_id'] as String? ?? '',
    subjectId: json['subject_id'] as String?,
    titleAr: json['title_ar'] as String? ?? '',
    titleEn: json['title_en'] as String?,
    bodyAr: json['body_ar'] as String?,
    bodyEn: json['body_en'] as String?,
    isActive: json['is_active'] as bool? ?? true,
    createdAt: json['created_at'] as String? ?? '',
  );

  String title(String lang) => lang == 'ar' ? titleAr : (titleEn ?? titleAr);
  String? body(String lang) => lang == 'ar' ? bodyAr : (bodyEn ?? bodyAr);
}
