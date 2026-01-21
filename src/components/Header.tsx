import { useState } from 'react';
import { Menu, Search, User } from 'lucide-react';
import { Button } from './ui/button';
import { NotificationBell } from './NotificationBell';
import { ProfileSettingsDialog } from './ProfileSettingsDialog';

const Header = () => {
    const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);

    // Fallback: If no settings (loading) or no logo, show generic user icon.
    // However, header avatar usually reflects user profile image (firebase/google) or this app setting?
    // User requested "Profil ve Uygulama Ayarları penceresini buraya atayalım".
    // For consistency with sidebar, let's show settings.user_name logo if we had one specific for user, but 
    // here it acts as the trigger. The sidebar shows "User Name" & "Email". 
    // The previous icon was `User`. Let's assume this button represents the current user profile.

    // We can just keep the User icon for now, or use the app logo? 
    // Standard pattern: Header user icon = User Avatar. 
    // Sidebar top logo = App Logo.
    // The user's request is to make the BUTTON functional to open the settings.

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/60 px-6 backdrop-blur-xl transition-all">
            <button className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
            </button>
            <div className="flex-1">
                <form>
                    <div className="relative md:w-2/3 lg:w-1/3">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Projelerde ara..."
                            className="w-full rounded-full border bg-muted/50 pl-10 pr-4 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-ring transition-all"
                        />
                    </div>
                </form>
            </div>
            <div className="flex items-center gap-2">
                <NotificationBell />
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full overflow-hidden border"
                    onClick={() => setIsProfileSettingsOpen(true)}
                    title="Profil Ayarları"
                >
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">Kullanıcı Menüsü</span>
                </Button>
            </div>

            <ProfileSettingsDialog
                isOpen={isProfileSettingsOpen}
                onClose={() => setIsProfileSettingsOpen(false)}
            />
        </header>
    );
};

export default Header;
