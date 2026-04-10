import 'stage.dart';

class Subject {
  final String id;
  final String? stageId;
  final String? teacherId;
  final String titleAr;
  final String? titleEn;
  final String? descriptionAr;
  final String? descriptionEn;
  final String? teaserAr;
  final String? teaserEn;
  final String accessType;
  final int sortOrder;
  final bool isActive;
  final bool? isPaid;
  final double? priceAmount;
  final String? priceCurrency;
  final String? coverImageUrl;
  final Stage? stage;
  // From RPC
  final int? totalLessons;
  final int? completedLessons;
  final int? progressPercent;
  final String? entitlementReason;
  final String? lockReason;
  // Teacher name from join
  final String? teacherName;
  // Rating data
  final double? averageRating;
  final int? ratingCount;
  final int? enrollmentCount;

  const Subject({
    required this.id,
    this.stageId,
    this.teacherId,
    required this.titleAr,
    this.titleEn,
    this.descriptionAr,
    this.descriptionEn,
    this.teaserAr,
    this.teaserEn,
    this.accessType = 'public',
    this.sortOrder = 0,
    this.isActive = true,
    this.isPaid,
    this.priceAmount,
    this.priceCurrency,
    this.coverImageUrl,
    this.stage,
    this.totalLessons,
    this.completedLessons,
    this.progressPercent,
    this.entitlementReason,
    this.lockReason,
    this.teacherName,
    this.averageRating,
    this.ratingCount,
    this.enrollmentCount,
  });

  factory Subject.fromJson(Map<String, dynamic> json) => Subject(
    id: json['id'] as String? ?? '',
    stageId: json['stage_id'] as String?,
    teacherId: json['teacher_id'] as String?,
    titleAr: json['title_ar'] as String? ?? '',
    titleEn: json['title_en'] as String?,
    descriptionAr: json['description_ar'] as String?,
    descriptionEn: json['description_en'] as String?,
    teaserAr: json['teaser_ar'] as String?,
    teaserEn: json['teaser_en'] as String?,
    accessType: json['access_type'] as String? ?? 'public',
    sortOrder: json['sort_order'] as int? ?? 0,
    isActive: json['is_active'] as bool? ?? true,
    isPaid: json['is_paid'] as bool?,
    priceAmount: (json['price_amount'] as num?)?.toDouble(),
    priceCurrency: json['price_currency'] as String?,
    coverImageUrl: json['cover_image_url'] as String?,
    stage: json['stage'] != null && json['stage'] is Map
        ? Stage.fromJson(Map<String, dynamic>.from(json['stage'] as Map))
        : null,
    totalLessons: json['total_lessons'] as int?,
    completedLessons: json['completed_lessons'] as int?,
    progressPercent: json['progress_percent'] as int?,
    entitlementReason: json['entitlement_reason'] as String?,
    lockReason: json['lock_reason'] as String?,
    teacherName: json['teacher_name'] as String? ?? (json['teacher'] is Map ? json['teacher']['full_name'] as String? : null),
    averageRating: (json['average_rating'] as num?)?.toDouble(),
    ratingCount: json['rating_count'] as int?,
    enrollmentCount: json['enrollment_count'] as int?,
  );

  String title(String lang) => lang == 'ar' ? titleAr : (titleEn ?? titleAr);
  String description(String lang) => lang == 'ar' ? (descriptionAr ?? '') : (descriptionEn ?? descriptionAr ?? '');
  String teaser(String lang) => lang == 'ar' ? (teaserAr ?? '') : (teaserEn ?? teaserAr ?? '');
}
