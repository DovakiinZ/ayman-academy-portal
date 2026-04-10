class Env {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://lkdbinrwojvrchunzqfq.supabase.co',
  );
  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGJpbnJ3b2p2cmNodW56cWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTE5NDUsImV4cCI6MjA4NTEyNzk0NX0.fuL0RfF2t8GneVQtoDk2ke_Ac7t-PAqXZkfr0FvLJnI',
  );
  static const webAppUrl = String.fromEnvironment('WEB_APP_URL', defaultValue: 'https://aymanacademy.com');
  static const oneSignalAppId = String.fromEnvironment('ONESIGNAL_APP_ID');
}
