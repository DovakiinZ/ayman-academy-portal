import 'lesson_section.dart';
import 'lesson_block.dart';
import 'lesson_progress.dart';

class Lesson {
  final String id;
  final String subjectId;
  final String titleAr;
  final String? titleEn;
  final String? summaryAr;
  final int sortOrder;
  final bool isPaid;
  final bool isPublished;
  final String? videoUrl;
  final int? durationMinutes;
  final String? createdBy;
  final List<LessonSection>? sections;
  final List<LessonBlock>? blocks;
  final LessonProgress? progress;

  const Lesson({
    required this.id,
    required this.subjectId,
    required this.titleAr,
    this.titleEn,
    this.summaryAr,
    this.sortOrder = 0,
    this.isPaid = false,
    this.isPublished = false,
    this.videoUrl,
    this.durationMinutes,
    this.createdBy,
    this.sections,
    this.blocks,
    this.progress,
  });

  factory Lesson.fromJson(Map<String, dynamic> json) => Lesson(
    id: json['id'] as String? ?? '',
    subjectId: json['subject_id'] as String? ?? '',
    titleAr: json['title_ar'] as String? ?? '',
    titleEn: json['title_en'] as String?,
    summaryAr: json['summary_ar'] as String?,
    sortOrder: json['sort_order'] as int? ?? 0,
    isPaid: json['is_paid'] as bool? ?? false,
    isPublished: json['is_published'] as bool? ?? false,
    videoUrl: json['video_url'] as String?,
    durationMinutes: json['duration_minutes'] as int?,
    createdBy: json['created_by'] as String?,
    sections: (json['lesson_sections'] as List<dynamic>?)
        ?.map((e) => LessonSection.fromJson(e as Map<String, dynamic>))
        .toList(),
    blocks: (json['lesson_blocks'] as List<dynamic>?)
        ?.map((e) => LessonBlock.fromJson(e as Map<String, dynamic>))
        .toList(),
  );

  String title(String lang) => lang == 'ar' ? titleAr : (titleEn ?? titleAr);
}
