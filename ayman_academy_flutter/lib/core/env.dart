class Env {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  static const webAppUrl = String.fromEnvironment('WEB_APP_URL', defaultValue: 'https://aymanacademy.com');
  static const oneSignalAppId = String.fromEnvironment('ONESIGNAL_APP_ID');
}
