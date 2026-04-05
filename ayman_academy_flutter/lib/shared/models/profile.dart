class Profile {
  final String id;
  final String email;
  final String? fullName;
  final String role;
  final String? avatarUrl;
  final bool isActive;
  final String? languagePref;
  final String? studentStage;
  final int? grade;
  final String? gender;
  final String? bioAr;
  final String? bioEn;
  final bool? showOnHome;
  final List<String>? expertiseTagsAr;
  final String? shamcashAccountName;
  final String? shamcashAccountNumber;
  final String createdAt;

  const Profile({
    required this.id,
    required this.email,
    this.fullName,
    required this.role,
    this.avatarUrl,
    this.isActive = true,
    this.languagePref,
    this.studentStage,
    this.grade,
    this.gender,
    this.bioAr,
    this.bioEn,
    this.showOnHome,
    this.expertiseTagsAr,
    this.shamcashAccountName,
    this.shamcashAccountNumber,
    required this.createdAt,
  });

  factory Profile.fromJson(Map<String, dynamic> json) => Profile(
    id: json['id'] as String? ?? '',
    email: json['email'] as String? ?? '',
    fullName: json['full_name'] as String?,
    role: json['role'] as String? ?? 'student',
    avatarUrl: json['avatar_url'] as String?,
    isActive: json['is_active'] as bool? ?? true,
    languagePref: json['language_pref'] as String?,
    studentStage: json['student_stage'] as String?,
    grade: json['grade'] as int?,
    gender: json['gender'] as String?,
    bioAr: json['bio_ar'] as String?,
    bioEn: json['bio_en'] as String?,
    showOnHome: json['show_on_home'] as bool?,
    expertiseTagsAr: (json['expertise_tags_ar'] as List<dynamic>?)?.cast<String>(),
    shamcashAccountName: json['shamcash_account_name'] as String?,
    shamcashAccountNumber: json['shamcash_account_number'] as String?,
    createdAt: json['created_at'] as String? ?? '',
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'full_name': fullName,
    'role': role,
    'avatar_url': avatarUrl,
    'is_active': isActive,
    'language_pref': languagePref,
    'student_stage': studentStage,
    'grade': grade,
    'gender': gender,
    'bio_ar': bioAr,
    'bio_en': bioEn,
    'show_on_home': showOnHome,
    'expertise_tags_ar': expertiseTagsAr,
    'shamcash_account_name': shamcashAccountName,
    'shamcash_account_number': shamcashAccountNumber,
  };

  String displayName(String lang) {
    return fullName ?? (lang == 'ar' ? 'مستخدم' : 'User');
  }

  String bio(String lang) {
    return lang == 'ar' ? (bioAr ?? '') : (bioEn ?? bioAr ?? '');
  }
}
