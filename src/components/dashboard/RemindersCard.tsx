import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReminders, updateTask } from '../../services/apiTasks';
import { Bell, Clock, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format, isSameDay, isSameWeek, isSameMonth, isSameYear, isBefore } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    Dialog,
} from "../ui/dialog";
import { toast } from 'sonner';

type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'all';

interface RemindersCardProps {
    className?: string;
}

export function RemindersCard({ className }: RemindersCardProps) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [filter, setFilter] = useState<TimeFilter>('week');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data: reminders = [] } = useQuery({
        queryKey: ['reminders'],
        queryFn: getReminders,
    });

    const completeMutation = useMutation({
        mutationFn: (id: string) => updateTask(id, { is_completed: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] }); // İlgili proje listesi de güncellensin
            toast.success('Görev tamamlandı.');
        },
    });

    // Filter logic
    const filteredReminders = reminders.filter(r => {
        if (!r.reminder_date) return false;
        const date = new Date(r.reminder_date);
        const now = new Date();

        switch (filter) {
            case 'day': return isSameDay(date, now);
            case 'week': return isSameWeek(date, now, { weekStartsOn: 1 }); // Pazartesi başlar
            case 'month': return isSameMonth(date, now);
            case 'year': return isSameYear(date, now);
            case 'all': return true;
        }
    });

    // Check for overdue (kırmızı uyarı)
    const now = new Date();
    const overdueCount = reminders.filter(r => r.reminder_date && isBefore(new Date(r.reminder_date), now)).length;

    return (
        <>
            <div
                className={cn(
                    "relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-md cursor-pointer group",
                    className
                )}
                onClick={() => setIsDialogOpen(true)}
            >
                <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Hatırlatıcılar</h3>
                    <Bell className={cn("h-4 w-4", overdueCount > 0 ? "text-red-500 animate-pulse" : "text-amber-500")} />
                </div>

                <div className="p-6 pt-0">
                    <div className="text-2xl font-bold flex items-center gap-2">
                        {filteredReminders.length}
                        {overdueCount > 0 && (
                            <span className="flex h-2 w-2 rounded-full bg-red-500" title={`${overdueCount} gecikmiş hatırlatma`} />
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                        {filter === 'day' && "Bugünkü hatırlatmalar"}
                        {filter === 'week' && "Bu haftaki hatırlatmalar"}
                        {filter === 'month' && "Bu ayki hatırlatmalar"}
                        {filter === 'year' && "Bu yılki hatırlatmalar"}
                        {filter === 'all' && "Tüm hatırlatmalar"}
                    </p>

                    {/* Filters overlay on hover, or always visible? Let's make it part of card content butstopPropagation */}
                    <div className="flex gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
                        {(['day', 'week', 'month', 'year', 'all'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-1.5 py-0.5 text-[10px] uppercase font-bold rounded transition-colors",
                                    filter === f
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                            >
                                {f === 'day' ? 'G' : f === 'week' ? 'H' : f === 'month' ? 'A' : f === 'year' ? 'Y' : 'T'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Decorative bg icon */}
                <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-5 pointer-events-none">
                    <Clock className="w-24 h-24" />
                </div>
            </div>

            <Dialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                title="Hatırlatıcılar"
                description="Yaklaşan ve geciken görev hatırlatmalarınız."
            >
                <div className="max-h-[60vh] overflow-y-auto mt-4 pr-1">
                    {filteredReminders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                            Bu dönem için hatırlatma bulunmuyor.
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {filteredReminders.map(task => {
                                const date = new Date(task.reminder_date!);
                                const isOverdue = isBefore(date, now);

                                return (
                                    <div
                                        key={task.id}
                                        onClick={() => {
                                            setIsDialogOpen(false);
                                            if (task.project_id) {
                                                navigate(`/projects/${task.project_id}`);
                                            }
                                        }}
                                        className={cn(
                                            "flex items-start gap-4 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                                            isOverdue ? "bg-red-50 border-red-200 hover:bg-red-100" : "bg-card"
                                        )}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted">
                                                    {task.projects?.title || 'Projesiz'}
                                                </span>
                                                <span className={cn(
                                                    "text-xs flex items-center gap-1 font-medium",
                                                    isOverdue ? "text-red-600" : "text-amber-600"
                                                )}>
                                                    <Clock className="w-3 h-3" />
                                                    {format(date, 'd MMM HH:mm', { locale: tr })}
                                                    {isOverdue && "(Gecikmiş)"}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium">{task.content}</p>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                completeMutation.mutate(task.id);
                                            }}
                                            disabled={completeMutation.isPending}
                                            className="group flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors"
                                            title="Tamamlandı olarak işaretle"
                                        >
                                            <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center opacity-50 group-hover:opacity-100">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </Dialog>
        </>
    );
}
