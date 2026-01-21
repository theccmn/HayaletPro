import { useState, useEffect } from 'react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAppSettings } from '../context/AppSettingsContext'; // Singular export
import { uploadAppLogo } from '../services/apiAppSettings';
import { User, Smartphone, Palette, Loader2, Monitor, Moon, Sun, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProfileSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileSettingsDialog({ isOpen, onClose }: ProfileSettingsDialogProps) {
    const { settings, updateSettings, isUpdating } = useAppSettings();
    const [activeTab, setActiveTab] = useState<'profile' | 'app' | 'appearance'>('profile');

    // Local state for form fields
    const [userName, setUserName] = useState('');
    const [appTitle, setAppTitle] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
    const [isUploading, setIsUploading] = useState(false);

    // Sync state with settings when dialog opens or settings load
    useEffect(() => {
        if (settings) {
            setUserName(settings.user_name || 'Kullanıcı');
            setAppTitle(settings.app_title || 'Hayalet Pro');
            setLogoUrl(settings.logo_url || '');
            setTheme(settings.theme || 'light');
        }
    }, [settings, isOpen]);

    const handleSave = () => {
        updateSettings({
            user_name: userName,
            app_title: appTitle,
            logo_url: logoUrl,
            theme: theme
        });
        onClose();
        // Toast is handled in context
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await uploadAppLogo(file);
            setLogoUrl(url);
        } catch (error) {
            console.error('Logo upload error:', error);
            // Error handling via context or local alert needed? 
            // Since we don't have toast imported here (removed earlier), we might rely on console or re-import toast if needed.
            // But let's just log for now as user didn't ask for generic error handling UI here specifically.
            alert('Logo yüklenirken bir hata oluştu');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Profil ve Uygulama Ayarları"
            description="Kullanıcı profilinizi ve uygulama görünümünü özelleştirin."
        >
            <div className="flex flex-col md:flex-row gap-6 mt-4 min-h-[300px]">
                {/* Sidebar / Tabs */}
                <div className="w-full md:w-48 flex-shrink-0 space-y-1 border-r pr-4">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left",
                            activeTab === 'profile' ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                        )}
                    >
                        <User className="h-4 w-4" />
                        Profil
                    </button>
                    <button
                        onClick={() => setActiveTab('app')}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left",
                            activeTab === 'app' ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                        )}
                    >
                        <Smartphone className="h-4 w-4" />
                        Uygulama
                    </button>
                    <button
                        onClick={() => setActiveTab('appearance')}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left",
                            activeTab === 'appearance' ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                        )}
                    >
                        <Palette className="h-4 w-4" />
                        Görünüm
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-4">
                    {activeTab === 'profile' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div>
                                <h4 className="font-medium mb-1">Kullanıcı Bilgileri</h4>
                                <p className="text-sm text-muted-foreground">Uygulamada görünen adınızı düzenleyin.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="userName">Kullanıcı Adı</Label>
                                <Input
                                    id="userName"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="Adınız Soyadınız"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'app' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div>
                                <h4 className="font-medium mb-1">Uygulama Markalama</h4>
                                <p className="text-sm text-muted-foreground">Uygulama başlığı ve logosunu özelleştirin.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="appTitle">Uygulama Başlığı</Label>
                                <Input
                                    id="appTitle"
                                    value={appTitle}
                                    onChange={(e) => setAppTitle(e.target.value)}
                                    placeholder="Örn. Hayalet Pro"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Uygulama Logosu</Label>
                                <div className="flex items-start gap-4 p-4 border rounded-lg bg-card bg-muted/20">
                                    <div className="relative shrink-0 size-16 rounded-lg border bg-background flex items-center justify-center overflow-hidden">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <ImageIcon className="text-muted-foreground/40" />
                                        )}
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                                <Loader2 className="animate-spin size-5 text-primary" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                <Input
                                                    id="logo-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleLogoUpload}
                                                    disabled={isUploading}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => document.getElementById('logo-upload')?.click()}
                                                    disabled={isUploading}
                                                    className="w-full"
                                                >
                                                    <Upload className="size-3.5 mr-2" />
                                                    Bilgisayardan Yükle
                                                </Button>
                                            </div>
                                            {logoUrl && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs justify-start px-2"
                                                    onClick={() => setLogoUrl('')}
                                                >
                                                    Logoyu Kaldır
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            Önerilen boyut: 200x200px. PNG veya JPG formatı.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div>
                                <h4 className="font-medium mb-1">Tema Seçimi</h4>
                                <p className="text-sm text-muted-foreground">Uygulama temasını tercihlerinize göre ayarlayın.</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => setTheme('light')}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:bg-muted/50",
                                        theme === 'light' ? "border-primary bg-primary/5" : "border-transparent bg-card shadow-sm"
                                    )}
                                >
                                    <Sun className="h-6 w-6" />
                                    <span className="text-sm font-medium">Aydınlık</span>
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:bg-muted/50",
                                        theme === 'dark' ? "border-primary bg-primary/5" : "border-transparent bg-card shadow-sm"
                                    )}
                                >
                                    <Moon className="h-6 w-6" />
                                    <span className="text-sm font-medium">Karanlık</span>
                                </button>
                                <button
                                    onClick={() => setTheme('system')}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:bg-muted/50",
                                        theme === 'system' ? "border-primary bg-primary/5" : "border-transparent bg-card shadow-sm"
                                    )}
                                >
                                    <Monitor className="h-6 w-6" />
                                    <span className="text-sm font-medium">Sistem</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>İptal</Button>
                <Button onClick={handleSave} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Kaydet
                </Button>
            </div>
        </Dialog>
    );
}
