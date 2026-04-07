import 'package:hive_flutter/hive_flutter.dart';
import 'cache_service.dart';

/// Wraps a Supabase fetch with Hive caching.
/// Returns cached data first (if valid), then fetches fresh data.
/// This is a helper for use inside FutureProviders.
Future<List<T>> cachedListFetch<T>({
  required String cacheKey,
  required String boxName,
  required Duration ttl,
  required Future<List<dynamic>> Function() fetch,
  required T Function(Map<String, dynamic> json) fromJson,
}) async {
  final box = Hive.box(boxName);

  // Try cache first
  final cached = CacheService.get<List<dynamic>>(box, cacheKey);
  if (cached != null) {
    try {
      return cached.map((e) => fromJson(Map<String, dynamic>.from(e as Map))).toList();
    } catch (_) {
      // Cache corrupted, fetch fresh
    }
  }

  // Fetch from Supabase
  final data = await fetch();
  final items = data.map((e) => fromJson(Map<String, dynamic>.from(e as Map))).toList();

  // Save to cache
  await CacheService.set(box, cacheKey, data, ttl);

  return items;
}

/// Same but for a single item
Future<T?> cachedSingleFetch<T>({
  required String cacheKey,
  required String boxName,
  required Duration ttl,
  required Future<Map<String, dynamic>?> Function() fetch,
  required T Function(Map<String, dynamic> json) fromJson,
}) async {
  final box = Hive.box(boxName);

  final cached = CacheService.get<Map>(box, cacheKey);
  if (cached != null) {
    try {
      return fromJson(Map<String, dynamic>.from(cached));
    } catch (_) {}
  }

  final data = await fetch();
  if (data == null) return null;

  final item = fromJson(data);
  await CacheService.set(box, cacheKey, data, ttl);
  return item;
}
