import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_theme.dart';
import 'package:ayman_academy_app/core/router/router.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/providers/theme_provider.dart';
import 'package:ayman_academy_app/shared/services/cache_service.dart';
import 'package:ayman_academy_app/shared/services/notification_service.dart';
import 'package:ayman_academy_app/shared/widgets/connectivity_banner.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await CacheService.initBoxes();
  await initSupabase();
  await NotificationService.initialize();

  runApp(const ProviderScope(child: AymanAcademyApp()));
}

class AymanAcademyApp extends ConsumerStatefulWidget {
  const AymanAcademyApp({super.key});

  @override
  ConsumerState<AymanAcademyApp> createState() => _AymanAcademyAppState();
}

class _AymanAcademyAppState extends ConsumerState<AymanAcademyApp> {
  @override
  void initState() {
    super.initState();
    // Set up notification tap routing after router is available
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final router = ref.read(routerProvider);
      NotificationService.setupHandlers(
        onNavigate: (route) => router.go(route),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(languageProvider);
    final themeMode = ref.watch(themeProvider);
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'أكاديمية أيمن',
      debugShowCheckedModeBanner: false,
      locale: locale,
      supportedLocales: const [
        Locale('ar', 'SA'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      routerConfig: router,
      builder: (context, child) {
        return Column(
          children: [
            const ConnectivityBanner(),
            Expanded(child: child ?? const SizedBox.shrink()),
          ],
        );
      },
    );
  }
}
