import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/features/auth/screens/login_screen.dart';
import 'package:ayman_academy_app/features/auth/screens/register_screen.dart';
import 'package:ayman_academy_app/features/auth/screens/reset_password_screen.dart';
import 'package:ayman_academy_app/features/auth/screens/admin_web_only_screen.dart';
import 'package:ayman_academy_app/features/onboarding/screens/student_onboarding_screen.dart';
import 'package:ayman_academy_app/features/student/dashboard/screens/student_dashboard_screen.dart';
import 'package:ayman_academy_app/features/student/subjects/screens/my_subjects_screen.dart';
import 'package:ayman_academy_app/features/student/subjects/screens/subject_detail_screen.dart';
import 'package:ayman_academy_app/features/student/subjects/screens/discover_screen.dart';
import 'package:ayman_academy_app/features/student/lessons/screens/lesson_player_screen.dart';
import 'package:ayman_academy_app/features/student/quiz/screens/quiz_screen.dart';
import 'package:ayman_academy_app/features/student/certificates/screens/my_certificates_screen.dart';
import 'package:ayman_academy_app/features/student/certificates/screens/certificate_detail_screen.dart';
import 'package:ayman_academy_app/features/student/messages/screens/messages_contacts_screen.dart';
import 'package:ayman_academy_app/features/student/messages/screens/chat_screen.dart';
import 'package:ayman_academy_app/features/student/profile/screens/student_profile_screen.dart';
import 'package:ayman_academy_app/features/student/marketplace/screens/marketplace_screen.dart';
import 'package:ayman_academy_app/features/student/marketplace/screens/checkout_screen.dart';
import 'package:ayman_academy_app/features/teacher/dashboard/screens/teacher_dashboard_screen.dart';
import 'package:ayman_academy_app/features/teacher/subjects/screens/teacher_subjects_screen.dart';
import 'package:ayman_academy_app/features/teacher/announcements/screens/teacher_announcements_screen.dart';
import 'package:ayman_academy_app/features/teacher/messages/screens/teacher_messages_screen.dart';
import 'package:ayman_academy_app/features/teacher/profile/screens/teacher_profile_screen.dart';
import 'package:ayman_academy_app/features/teacher/orders/screens/teacher_orders_screen.dart';
import 'package:ayman_academy_app/shared/widgets/shells/student_shell.dart';
import 'package:ayman_academy_app/shared/widgets/shells/teacher_shell.dart';

class GoRouterRefreshStream extends ChangeNotifier {
  late final StreamSubscription _sub;
  GoRouterRefreshStream(Stream stream) {
    _sub = stream.listen((_) => notifyListeners());
  }
  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: Routes.login,
    refreshListenable: GoRouterRefreshStream(
      supabase.auth.onAuthStateChange,
    ),
    redirect: (context, state) {
      if (auth.status == AuthStatus.loading) return null;

      final path = state.uri.path;
      final isAuthRoute = path.startsWith('/auth');

      if (!auth.isAuthenticated && !isAuthRoute) return Routes.login;

      if (auth.isAuthenticated && isAuthRoute) {
        if (auth.isAdmin) return Routes.adminWebOnly;
        return auth.isTeacher ? Routes.teacherHome : Routes.studentHome;
      }

      if (auth.isAdmin && path != Routes.adminWebOnly) return Routes.adminWebOnly;

      if (auth.needsOnboarding && path != Routes.onboarding) {
        return Routes.onboarding;
      }

      if (auth.isTeacher && path.startsWith('/student')) return Routes.teacherHome;
      if (auth.isStudent && path.startsWith('/teacher')) return Routes.studentHome;

      return null;
    },
    routes: [
      // Auth routes
      GoRoute(path: Routes.login, builder: (_, _) => const LoginScreen()),
      GoRoute(path: Routes.register, builder: (_, _) => const RegisterScreen()),
      GoRoute(path: Routes.resetPassword, builder: (_, _) => const ResetPasswordScreen()),
      GoRoute(path: Routes.onboarding, builder: (_, _) => const StudentOnboardingScreen()),
      GoRoute(path: Routes.adminWebOnly, builder: (_, _) => const AdminWebOnlyScreen()),

      // Student shell
      StatefulShellRoute.indexedStack(
        builder: (_, _2, shell) => StudentShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.studentHome, builder: (_, _) => const StudentDashboardScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.mySubjects,
              builder: (_, _) => const MySubjectsScreen(),
              routes: [
                GoRoute(
                  path: 'subject/:subjectId',
                  builder: (_, state) => SubjectDetailScreen(
                    subjectId: state.pathParameters['subjectId']!,
                  ),
                  routes: [
                    GoRoute(
                      path: 'lesson/:lessonId',
                      builder: (_, state) => LessonPlayerScreen(
                        lessonId: state.pathParameters['lessonId']!,
                      ),
                    ),
                    GoRoute(
                      path: 'quiz/:quizId',
                      builder: (_, state) => QuizScreen(
                        quizId: state.pathParameters['quizId']!,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.certificates,
              builder: (_, _) => const MyCertificatesScreen(),
              routes: [
                GoRoute(
                  path: ':certId',
                  builder: (_, state) => CertificateDetailScreen(
                    certId: state.pathParameters['certId']!,
                  ),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.studentMessages,
              builder: (_, _) => const MessagesContactsScreen(),
              routes: [
                GoRoute(
                  path: ':contactId',
                  builder: (_, state) => ChatScreen(
                    contactId: state.pathParameters['contactId']!,
                    contactName: state.extra as String?,
                  ),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.studentProfile, builder: (_, _) => const StudentProfileScreen()),
          ]),
        ],
      ),

      // Standalone student routes (outside shell)
      GoRoute(path: Routes.marketplace, builder: (_, _) => const MarketplaceScreen()),
      GoRoute(
        path: '/student/marketplace/checkout/:subjectId',
        builder: (_, state) => CheckoutScreen(
          subjectId: state.pathParameters['subjectId']!,
        ),
      ),
      GoRoute(path: '/student/discover', builder: (_, _) => const DiscoverScreen()),

      // Teacher shell
      StatefulShellRoute.indexedStack(
        builder: (_, _2, shell) => TeacherShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.teacherHome, builder: (_, _) => const TeacherDashboardScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.teacherSubjects, builder: (_, _) => const TeacherSubjectsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.teacherAnnouncements, builder: (_, _) => const TeacherAnnouncementsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.teacherMessages,
              builder: (_, _) => const TeacherMessagesScreen(),
              routes: [
                GoRoute(
                  path: ':contactId',
                  builder: (_, state) => ChatScreen(
                    contactId: state.pathParameters['contactId']!,
                    contactName: state.extra as String?,
                  ),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.teacherProfile, builder: (_, _) => const TeacherProfileScreen()),
          ]),
        ],
      ),

      // Standalone teacher routes
      GoRoute(path: Routes.teacherOrders, builder: (_, _) => const TeacherOrdersScreen()),
    ],
  );
});
