import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/shared/models/profile.dart';
import 'package:ayman_academy_app/features/auth/data/auth_repository.dart';

enum AuthStatus { loading, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final Profile? profile;

  const AuthState({
    this.status = AuthStatus.loading,
    this.profile,
  });

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isStudent => profile?.role == 'student';
  bool get isTeacher => profile?.role == 'teacher';
  bool get isAdmin => profile?.role == 'super_admin';
  bool get needsOnboarding => isStudent && (profile?.studentStage == null);

  AuthState copyWith({AuthStatus? status, Profile? profile}) {
    return AuthState(
      status: status ?? this.status,
      profile: profile ?? this.profile,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;
  StreamSubscription? _authSub;

  AuthNotifier(this._repo) : super(const AuthState()) {
    _init();
  }

  void _init() {
    _authSub = _repo.authStateChanges.listen((event) async {
      if (event.session != null) {
        final profile = await _repo.fetchProfile(event.session!.user.id);
        if (profile != null) {
          state = AuthState(status: AuthStatus.authenticated, profile: profile);
        } else {
          state = const AuthState(status: AuthStatus.unauthenticated);
        }
      } else {
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    });
    _checkCurrentSession();
  }

  Future<void> _checkCurrentSession() async {
    final session = _repo.currentSession;
    if (session != null) {
      final profile = await _repo.fetchProfile(session.user.id);
      if (profile != null) {
        state = AuthState(status: AuthStatus.authenticated, profile: profile);
        return;
      }
    }
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> signIn(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      await _repo.signIn(email, password);
    } catch (e) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      rethrow;
    }
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String fullName,
  }) async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      await _repo.signUp(email: email, password: password, fullName: fullName);
    } catch (e) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      rethrow;
    }
  }

  Future<void> signOut() async {
    await _repo.signOut();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> resetPassword(String email) async {
    await _repo.resetPassword(email);
  }

  Future<void> refreshProfile() async {
    final user = _repo.currentUser;
    if (user == null) return;
    final profile = await _repo.fetchProfile(user.id);
    if (profile != null) {
      state = AuthState(status: AuthStatus.authenticated, profile: profile);
    }
  }

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(authRepositoryProvider));
});
