import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderKanban,
    Calendar,
    Calculator,
    Users,
    Package,
    Settings,
    LogOut,
    UserCircle,
    Ghost
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../context/AppSettingsContext';
import { ProfileSettingsDialog } from './ProfileSettingsDialog';
import { toast } from 'sonner';

const Sidebar = () => {
    const { user, signOut } = useAuth();
    const { settings } = useAppSettings();
    const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);

    const navItems = [
        { icon: LayoutDashboard, label: 'Gösterge Paneli', path: '/dashboard' },
        { icon: FolderKanban, label: 'Projeler', path: '/projects' },
        { icon: Calculator, label: 'Muhasebe', path: '/finance' },
        { icon: Calendar, label: 'Takvim', path: '/calendar' },
        { icon: Users, label: 'Müşteriler', path: '/clients' },
        { icon: Package, label: 'Envanter', path: '/inventory' },
        { icon: Settings, label: 'Ayarlar', path: '/settings' },
    ];

    const handleLogout = async () => {
        try {
            await signOut();
            toast.success('Çıkış yapıldı');
        } catch (error) {
            toast.error('Çıkış yapılırken bir hata oluştu');
        }
    };

    return (
        <>
            <aside className="hidden w-72 flex-col border-r bg-card/50 backdrop-blur-xl md:flex h-screen sticky top-0">
                <div className="flex h-16 items-center border-b px-6 gap-2">
                    {settings?.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" className="h-8 w-auto max-w-[140px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                    ) : (
                        <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                            <Ghost className="size-5" />
                        </div>
                    )}
                    <div className={cn("size-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground hidden", settings?.logo_url && "hidden")}>
                        <Ghost className="size-5" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">{settings?.app_title || 'Hayalet Pro'}</span>
                </div>

                <div className="flex-1 overflow-auto py-6 px-4">
                    <nav className="grid gap-1.5">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground group",
                                        isActive ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground" : "text-muted-foreground"
                                    )
                                }
                            >
                                <item.icon className="h-4 w-4 shrink-0" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className="border-t p-4">
                    <div
                        className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm mb-4 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setIsProfileSettingsOpen(true)}
                        title="Profil ayarlarını düzenle"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-background">
                            <UserCircle className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium leading-none truncate">{settings?.user_name || 'Kullanıcı'}</span>
                            <span className="text-xs text-muted-foreground mt-1 truncate" title={user?.email}>{user?.email || 'Giriş Yapılmadı'}</span>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:border-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-4 w-4" />
                        Çıkış Yap
                    </Button>
                </div>
            </aside>

            <ProfileSettingsDialog
                isOpen={isProfileSettingsOpen}
                onClose={() => setIsProfileSettingsOpen(false)}
            />
        </>
    );
};

export default Sidebar;
