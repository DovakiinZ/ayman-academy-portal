import 'package:flutter/material.dart';

class AppColors {
  // ── Primary Brand ──
  static const primary = Color(0xFF1A1A1A);        // Near-black for iOS-premium feel
  static const primaryLight = Color(0xFF2D2D2D);    // Slightly lighter for dark mode
  static const primaryForeground = Color(0xFFFFFFFF);

  // ── Accent ──
  static const accent = Color(0xFF5856D6);          // iOS purple accent
  static const accentLight = Color(0xFF7B79E8);     // Lighter accent variant
  static const gold = Color(0xFFAE944F);            // Keep brand gold

  // ── Star / Rating ──
  static const starYellow = Color(0xFFF4C150);      // Udemy star gold
  static const starFilled = Color(0xFFE59819);       // Filled star darker gold

  // ── Bestseller Badge ──
  static const bestsellerBg = Color(0xFFECEB98);    // Udemy bestseller yellow
  static const bestsellerText = Color(0xFF3D3C0A);  // Udemy bestseller text

  // ── Backgrounds ──
  static const background = Color(0xFFF2F2F7);       // iOS system grouped background
  static const surface = Color(0xFFFFFFFF);           // White card surfaces
  static const secondary = Color(0xFFE5E5EA);        // iOS system gray 5
  static const inputFill = Color(0xFFEFEFF4);        // Input field fill
  static const tertiary = Color(0xFFF0F0F0);         // Slightly darker for chips/tags

  // ── Dark Mode Backgrounds ──
  static const backgroundDark = Color(0xFF000000);   // True black (iOS OLED)
  static const surfaceDark = Color(0xFF1C1C1E);      // iOS dark surface
  static const secondaryDark = Color(0xFF2C2C2E);    // iOS dark secondary

  // ── Borders — Thin & Subtle ──
  static const border = Color(0xFFE5E5EA);           // iOS system gray 5
  static const borderDark = Color(0xFF38383A);       // iOS dark border

  // ── Separator ──
  static const separator = Color(0xFFC6C6C8);       // iOS separator
  static const separatorDark = Color(0xFF545458);    // iOS dark separator

  // ── Text ──
  static const ink = Color(0xFF000000);              // Pure black text
  static const inkSecondary = Color(0xFF3C3C43);     // Secondary label
  static const inkMuted = Color(0xFF8E8E93);         // iOS system gray
  static const inkDark = Color(0xFFFFFFFF);          // White text for dark mode
  static const inkSecondaryDark = Color(0xFFEBEBF5); // Dark mode secondary

  // ── Block Type Colors (kept) ──
  static const tipBackground = Color(0xFFEFF6FF);
  static const tipBorder = Color(0xFF3B82F6);
  static const warningBackground = Color(0xFFFFFBEB);
  static const warningBorder = Color(0xFFF59E0B);
  static const exampleBackground = Color(0xFFECFDF5);
  static const exampleBorder = Color(0xFF10B981);
  static const exerciseBackground = Color(0xFFFFF7ED);
  static const exerciseBorder = Color(0xFFF97316);
  static const equationBackground = Color(0xFFEEF2FF);
  static const equationBorder = Color(0xFF6366F1);
  static const qaBackground = Color(0xFFFDF2F8);
  static const qaBorder = Color(0xFFEC4899);

  // ── Semantic ──
  static const success = Color(0xFF34C759);          // iOS green
  static const warning = Color(0xFFFF9500);          // iOS orange
  static const error = Color(0xFFFF3B30);            // iOS red
  static const info = Color(0xFF007AFF);             // iOS blue
}
