import 'package:hive_flutter/hive_flutter.dart';

class CacheService {
  static const subjectsTtl = Duration(hours: 24);
  static const lessonsTtl = Duration(hours: 24);
  static const progressTtl = Duration(minutes: 5);

  static Future<void> initBoxes() async {
    await Hive.openBox('settings');
    await Hive.openBox('subjects_cache');
    await Hive.openBox('lessons_cache');
    await Hive.openBox('progress_cache');
  }

  static T? get<T>(Box box, String key) {
    final entry = box.get(key);
    if (entry == null) return null;
    if (entry is! Map) return null;
    final timestamp = entry['ts'] as int? ?? 0;
    final ttl = entry['ttl'] as int? ?? 0;
    if (DateTime.now().millisecondsSinceEpoch - timestamp > ttl) {
      box.delete(key);
      return null;
    }
    return entry['data'] as T?;
  }

  static Future<void> set(Box box, String key, dynamic data, Duration ttl) async {
    await box.put(key, {
      'data': data,
      'ts': DateTime.now().millisecondsSinceEpoch,
      'ttl': ttl.inMilliseconds,
    });
  }

  static Future<void> clear(Box box) async {
    await box.clear();
  }
}
