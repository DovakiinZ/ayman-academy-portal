import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

class LanguageNotifier extends StateNotifier<Locale> {
  LanguageNotifier() : super(_loadLocale());

  static Locale _loadLocale() {
    final box = Hive.box('settings');
    final lang = box.get('language', defaultValue: 'ar') as String;
    return Locale(lang);
  }

  void toggle() {
    final newLang = state.languageCode == 'ar' ? 'en' : 'ar';
    Hive.box('settings').put('language', newLang);
    state = Locale(newLang);
  }

  void setLanguage(String langCode) {
    Hive.box('settings').put('language', langCode);
    state = Locale(langCode);
  }

  bool get isArabic => state.languageCode == 'ar';

  String t(String ar, String en) => isArabic ? ar : en;
}

final languageProvider = StateNotifierProvider<LanguageNotifier, Locale>((ref) {
  return LanguageNotifier();
});
