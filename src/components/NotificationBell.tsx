
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from './ui/button';
import { useNotifications } from '../context/NotificationContext';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from './ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-600 border border-white"></span>
                    )}
                    <span className="sr-only">Bildirimler</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold leading-none">Bildirimler</h4>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={markAllAsRead}>
                            <CheckCheck className="mr-1 h-3 w-3" />
                            Tümünü Okundu İşaretle
                        </Button>
                    )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Bildirim yok.
                        </div>
                    ) : (
                        <div className="grid gap-1 p-1">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`relative flex flex-col gap-1 p-3 text-sm rounded-md transition-colors hover:bg-muted cursor-pointer ${!notification.is_read ? 'bg-muted/30' : ''}`}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${!notification.is_read ? 'bg-blue-600' : 'bg-transparent'}`} />
                                        <div className="flex-1 space-y-1">
                                            <p className={`font-medium leading-none ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-muted-foreground text-xs line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: tr })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
