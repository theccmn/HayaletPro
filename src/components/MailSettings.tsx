import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, Save, AlertCircle, RefreshCw, Send, HelpCircle } from 'lucide-react';
import { getSetting, updateSetting } from '../services/apiSettings';
import { toast } from 'sonner';

export function MailSettings() {
    const [apiKey, setApiKey] = useState('');
    const [notificationEmail, setNotificationEmail] = useState('');
    const [fromName, setFromName] = useState('Hayalet Pro');
    const [fromEmail, setFromEmail] = useState('onboarding@resend.dev');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    // Initial Load
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [key, email, name, fEmail] = await Promise.all([
                    getSetting('mail_resend_api_key'),
                    getSetting('mail_notification_email'),
                    getSetting('mail_from_name'),
                    getSetting('mail_from_email')
                ]);

                if (key) setApiKey(key);
                if (email) setNotificationEmail(email);
                if (name) setFromName(name);
                if (fEmail) setFromEmail(fEmail);
            } catch (error) {
                console.error("Mail ayarları yüklenirken hata:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleTestMail = async () => {
        if (!apiKey) {
            toast.error("Önce API anahtarını kaydediniz.");
            return;
        }

        setIsTesting(true);
        try {
            // Import supabase client dynamically or pass it if available context
            // For now assuming we have a way to invoke function.
            // Since this component is inside the app which has supabase lib initialized:
            const { supabase } = await import('../lib/supabase');

            const { data, error } = await supabase.functions.invoke('send-email', {
                body: { type: 'test_email' }
            });

            if (error) throw error;

            toast.success("Test maili gönderildi! Gelen kutunuzu kontrol edin.");
        } catch (error: any) {
            console.error(error);
            toast.error(`Test başarısız: ${error.message || 'Bilinmeyen hata'}`);
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = async () => {
        if (!apiKey.trim()) {
            toast.error("Lütfen API Anahtarını giriniz.");
            return;
        }

        setIsSaving(true);
        try {
            await Promise.all([
                updateSetting('mail_resend_api_key', apiKey.trim()),
                updateSetting('mail_notification_email', notificationEmail.trim()),
                updateSetting('mail_from_name', fromName.trim()),
                updateSetting('mail_from_email', fromEmail.trim())
            ]);
            toast.success("Mail ayarları başarıyla kaydedildi.");
        } catch (error) {
            console.error(error);
            toast.error("Kaydedilirken hata oluştu.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 border rounded-xl bg-card space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Mail size={24} />
                </div>
                <div>
                    <h4 className="font-bold">E-Posta ve Bildirim Ayarları</h4>
                    <p className="text-xs text-muted-foreground">Müşteri fotoğraf seçimlerini tamamladığında size mail gönderen servis.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sol Kolon: Kritik Ayarlar */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            Resend API Key
                            <span className="text-xs text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="re_123456789..."
                                className="font-mono pr-10"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Resend.com panelinden alacağınız API anahtarı.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Bildirim Alıcısı (Sizin Mailiniz)</Label>
                        <Input
                            type="email"
                            value={notificationEmail}
                            onChange={(e) => setNotificationEmail(e.target.value)}
                            placeholder="ornek@hayalet.com"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Müşteri işlemi bitirince bildirim bu adrese gelir.
                        </p>
                    </div>
                </div>

                {/* Sağ Kolon: Gönderici Ayarları */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2 text-indigo-700 font-medium text-sm">
                        <Send size={14} /> Gönderici Bilgileri
                    </div>

                    <div className="space-y-2">
                        <Label>Gönderici Adı</Label>
                        <Input
                            value={fromName}
                            onChange={(e) => setFromName(e.target.value)}
                            placeholder="Hayalet Pro"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                            Gönderici Maili
                            <HelpCircle size={12} className="text-muted-foreground" />
                        </Label>
                        <Input
                            value={fromEmail}
                            onChange={(e) => setFromEmail(e.target.value)}
                            placeholder="onboarding@resend.dev"
                        />
                        <p className="text-[10px] text-amber-600">
                            Eğer kendi domaininizi doğrulamadıysanız sadece <strong>onboarding@resend.dev</strong> kullanabilirsiniz.
                        </p>
                    </div>
                </div>
            </div>



            <div className="pt-4 border-t flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                    {!apiKey && (
                        <span className="flex items-center gap-1 text-amber-600">
                            <AlertCircle size={12} /> Servis aktif değil
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleTestMail}
                        disabled={isSaving || isLoading || isTesting}
                    >
                        {isTesting ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : <Send size={16} className="mr-2" />}
                        Test Gönder
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || isLoading} className="min-w-[120px]">
                        {isSaving ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : <Save size={16} className="mr-2" />}
                        Ayarları Kaydet
                    </Button>
                </div>
            </div>
        </div >
    );
}
