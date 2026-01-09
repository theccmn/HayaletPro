import { Menu, Search, Bell, User } from 'lucide-react';
import { Button } from './ui/button';

const Header = () => {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/60 px-6 backdrop-blur-xl transition-all">
            <button className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
            </button>
            <div className="w-full flex-1">
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
                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Bildirimler</span>
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full overflow-hidden border">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">Kullanıcı Menüsü</span>
                </Button>
            </div>
        </header>
    );
};

export default Header;
