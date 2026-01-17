import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar, CheckCircle, Save, LogIn, LogOut, AlertCircle, RefreshCw } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { getSetting, updateSetting } from '../services/apiSettings';
import { setAccessToken, clearAccessToken, SCOPES, checkConnection } from '../services/apiGoogleCalendar';
import { toast } from 'sonner';

export function GoogleCalendarSettings() {
    const [clientId, setClientId] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    // Initial Load
    useEffect(() => {
        const loadSettings = async () => {
            const key = await getSetting('google_calendar_client_id');
            if (key) setClientId(key);

            const connected = await checkConnection();
            setIsConnected(connected);
            setIsChecking(false);
        };
        loadSettings();
    }, []);

    // Save Client ID
    const handleSaveKey = async () => {
        if (!clientId.trim()) {
            toast.error("Lütfen geçerli bir Client ID girin.");
            return;
        }

        setIsSaving(true);
        try {
            await updateSetting('google_calendar_client_id', clientId.trim());
            toast.success("Client ID kaydedildi. Lütfen sayfayı yenileyin.");
            // We might need to reload to re-init GoogleOAuthProvider with new ID if we did this globally
            // But for now, just toast.
        } catch (error) {
            console.error(error);
            toast.error("Kaydedilirken hata oluştu.");
        } finally {
            setIsSaving(false);
        }
    };

    // OAuth Login Flow
    const login = useGoogleLogin({
        onSuccess: async (codeResponse) => {
            await setAccessToken(codeResponse.access_token);
            setIsConnected(true);
            toast.success("Google Hesabı başarıyla bağlandı!");
        },
        onError: (error) => {
            console.error('Login Failed:', error);
            toast.error("Google giriş işlemi başarısız oldu.");
        },
        scope: SCOPES,
    });

    const handleDisconnect = async () => {
        await clearAccessToken();
        setIsConnected(false);
        toast.info("Google Hesabı bağlantısı kesildi.");
    };

    return (
        <div className="p-6 border rounded-xl bg-card space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Calendar size={24} />
                </div>
                <div>
                    <h4 className="font-bold">Google Takvim Entegrasyonu</h4>
                    <p className="text-xs text-muted-foreground">Projeleri ve teslimatları otomatik olarak Google Takvim'e ekleyin.</p>
                </div>
            </div>

            {/* Client ID Configuration */}
            <div className="space-y-2">
                <Label>Google Client ID</Label>
                <div className="flex gap-2">
                    <Input
                        type="password"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="apps.googleusercontent.com..."
                        className="font-mono"
                    />
                    <Button onClick={handleSaveKey} disabled={isSaving} className="min-w-[100px]">
                        {isSaving ? <RefreshCw className="animate-spin w-4 h-4" /> : <Save size={16} className="mr-2" />}
                        Kaydet
                    </Button>
                </div>
                {!clientId && (
                    <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-50 p-2 rounded">
                        <AlertCircle className="w-3 h-3" />
                        Entegrasyonu kullanmak için önce bir Client ID girmelisiniz.
                    </div>
                )}
            </div>

            {/* Connection Status */}
            {clientId && (
                <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Bağlantı Durumu:</span>
                            {isChecking ? (
                                <span className="text-xs text-muted-foreground">Kontrol ediliyor...</span>
                            ) : isConnected ? (
                                <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Bağlandı
                                </span>
                            ) : (
                                <span className="text-xs text-muted-foreground">Bağlı değil</span>
                            )}
                        </div>

                        {isConnected ? (
                            <Button onClick={handleDisconnect} variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                <LogOut className="w-4 h-4 mr-2" />
                                Bağlantıyı Kes
                            </Button>
                        ) : (
                            <Button onClick={() => login()} disabled={!clientId} size="sm" className="bg-blue-600 hover:bg-blue-700">
                                <LogIn className="w-4 h-4 mr-2" />
                                Google ile Bağlan
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
