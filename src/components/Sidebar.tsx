
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

const Sidebar = () => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: FolderKanban, label: 'Projeler', path: '/projects' },
        { icon: Calculator, label: 'Muhasebe', path: '/finance' },
        { icon: Calendar, label: 'Takvim', path: '/calendar' },
        { icon: Users, label: 'Müşteriler', path: '/clients' },
        { icon: Package, label: 'Envanter', path: '/inventory' },
        { icon: Settings, label: 'Ayarlar', path: '/settings' },
    ];

    return (
        <aside className="hidden w-72 flex-col border-r bg-card/50 backdrop-blur-xl md:flex h-screen sticky top-0">
            <div className="flex h-16 items-center border-b px-6 gap-2">
                <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                    <Ghost className="size-5" />
                </div>
                <span className="font-bold text-lg tracking-tight">Hayalet Pro</span>
                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-auto">v2.0</span>
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
                <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-background">
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium leading-none truncate">Kullanıcı</span>
                        <span className="text-xs text-muted-foreground mt-1 truncate">kullanici@hayalet.com</span>
                    </div>
                </div>
                <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:border-destructive hover:bg-destructive/10">
                    <LogOut className="h-4 w-4" />
                    Çıkış Yap
                </Button>
            </div>
        </aside>
    );
};

export default Sidebar;
