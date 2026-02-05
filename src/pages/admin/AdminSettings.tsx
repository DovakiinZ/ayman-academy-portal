import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminSettings() {
    const { t } = useLanguage();
    const { profile } = useAuth();

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('الإعدادات', 'Settings')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('إعدادات الحساب والنظام', 'Account and system settings')}
                </p>
            </div>

            <div className="space-y-6 max-w-2xl">
                {/* Profile Section */}
                <div className="bg-background rounded-lg border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <h2 className="font-medium text-foreground">{t('الملف الشخصي', 'Profile')}</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('الاسم الكامل', 'Full Name')}</Label>
                            <Input value={profile?.full_name || ''} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('البريد الإلكتروني', 'Email')}</Label>
                            <Input value={profile?.email || ''} disabled />
                        </div>
                    </div>
                </div>

                {/* Role Section */}
                <div className="bg-background rounded-lg border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-5 h-5 text-muted-foreground" />
                        <h2 className="font-medium text-foreground">{t('الصلاحيات', 'Permissions')}</h2>
                    </div>

                    <div className="bg-primary/10 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-foreground">{t('مدير النظام', 'Super Admin')}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {t('لديك صلاحيات كاملة لإدارة الأكاديمية', 'You have full permissions to manage the academy')}
                                </p>
                            </div>
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                </div>

                {/* System Info */}
                <div className="bg-background rounded-lg border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Settings className="w-5 h-5 text-muted-foreground" />
                        <h2 className="font-medium text-foreground">{t('معلومات النظام', 'System Info')}</h2>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('الإصدار', 'Version')}</span>
                            <span className="text-foreground">1.0.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('آخر تحديث', 'Last Updated')}</span>
                            <span className="text-foreground">2026</span>
                        </div>
                    </div>
                </div>

                {/* Connection Debug */}
                <ConnectionDebug />
            </div>
        </div>
    );
}

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Database, Wifi } from 'lucide-react';

function ConnectionDebug() {
    const { t } = useLanguage();
    const { session, profile } = useAuth();
    const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    const runTest = async () => {
        setStatus('testing');
        setLogs([]);
        addLog('Starting connection test...');

        try {
            // 1. Check Env
            const url = import.meta.env.VITE_SUPABASE_URL;
            addLog(`Supabase URL: ${url ? 'Configured' : 'MISSING'}`);
            if (url) addLog(`Project Ref: ${url.split('.')[0].replace('https://', '')}`);

            // 2. Check Session
            if (!session) {
                addLog('ERROR: No active session');
                throw new Error('No session');
            }
            addLog(`Session ID: ${session.user.id}`);
            addLog(`Profile Role: ${profile?.role || 'NULL'}`);

            // 3. Test Read (Stages)
            addLog('Testing READ (stages)...');
            const { data: readData, error: readError } = await supabase.from('stages').select('count').limit(1).single();
            if (readError) {
                addLog(`READ Error: ${readError.message}`);
                addLog(`Hint: RLS might be blocking select.`);
                throw readError;
            }
            addLog(`READ Success. Data: ${JSON.stringify(readData)}`);

            // 4. Test Write (System Settings - harmless update or just check)
            // We won't actually write garbage, but we can try to select something else.
            // User asked for "simple select", so we stop at read.

            setStatus('success');
            toast.success('Connection Verified');
            addLog('TEST COMPLETED SUCCESSFULLY');

        } catch (err: any) {
            setStatus('error');
            addLog(`TEST FAILED: ${err.message}`);
            toast.error('Connection Test Failed');
        }
    };

    return (
        <div className="bg-background rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-medium text-foreground">Connection & Debug</h2>
            </div>

            <div className="space-y-4">
                <div className="p-3 bg-secondary/50 rounded-md text-xs font-mono space-y-1">
                    <p>UID: {session?.user.id || 'Not Logged In'}</p>
                    <p>Role: {profile?.role || 'Unknown'}</p>
                    <p>Expires: {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'}</p>
                </div>

                <Button onClick={runTest} disabled={status === 'testing'} variant="outline" className="w-full">
                    {status === 'testing' ? (
                        <Loader2 className="w-4 h-4 animate-spin me-2" />
                    ) : (
                        <Wifi className="w-4 h-4 me-2" />
                    )}
                    Run Connection Test
                </Button>

                {logs.length > 0 && (
                    <div className="mt-4 p-3 bg-black/90 text-green-400 rounded-md text-xs font-mono h-40 overflow-y-auto">
                        {logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
