import 'package:intl/intl.dart';

String formatDate(String? isoDate, {String locale = 'en'}) {
  if (isoDate == null) return '';
  try {
    final date = DateTime.parse(isoDate);
    return DateFormat('yyyy/MM/dd', locale).format(date);
  } catch (_) {
    return isoDate;
  }
}

String formatDateTime(String? isoDate, {String locale = 'en'}) {
  if (isoDate == null) return '';
  try {
    final date = DateTime.parse(isoDate);
    return DateFormat('yyyy/MM/dd HH:mm', locale).format(date);
  } catch (_) {
    return isoDate;
  }
}

String timeAgo(String? isoDate, {bool arabic = true}) {
  if (isoDate == null) return '';
  try {
    final date = DateTime.parse(isoDate);
    final diff = DateTime.now().difference(date);
    if (diff.inDays > 30) {
      final months = (diff.inDays / 30).floor();
      return arabic ? 'منذ $months شهر' : '$months months ago';
    }
    if (diff.inDays > 0) {
      return arabic ? 'منذ ${diff.inDays} يوم' : '${diff.inDays} days ago';
    }
    if (diff.inHours > 0) {
      return arabic ? 'منذ ${diff.inHours} ساعة' : '${diff.inHours} hours ago';
    }
    if (diff.inMinutes > 0) {
      return arabic ? 'منذ ${diff.inMinutes} دقيقة' : '${diff.inMinutes} minutes ago';
    }
    return arabic ? 'الآن' : 'Just now';
  } catch (_) {
    return '';
  }
}
