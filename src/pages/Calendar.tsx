import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../services/apiProjects';
import { getStatuses } from '../services/apiStatuses';
import { getTransactions } from '../services/apiFinance';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
    addWeeks, subWeeks, addDays, subDays, startOfDay, endOfDay
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button } from '../components/ui/button';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

type ViewMode = 'month' | 'week' | 'day';

// Helper to determine text color based on background
// Helper to determine text color based on background
const getContrastColor = (hexColor: string) => {
    if (!hexColor || !hexColor.startsWith('#')) return '#000000'; // Default to black for safety

    // Convert hex to RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);

    // Calculate YIQ ratio
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    // Check contrast (>= 128 is light, so use black text)
    // Decreased threshold slightly to favor black text on mid-tones
    return (yiq >= 100) ? '#000000' : '#ffffff';
};

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    color: string;
    textColor: string;
    type: 'project' | 'job';
    time?: string;
}

export default function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<ViewMode>('month');

    // Fetch Data
    const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: getProjects });
    const { data: statuses } = useQuery({ queryKey: ['statuses'], queryFn: getStatuses });
    const { data: transactions } = useQuery({ queryKey: ['transactions'], queryFn: getTransactions });

    // Process Events
    const events = useMemo(() => {
        const allEvents: CalendarEvent[] = [];

        // 1. Projects
        projects?.forEach(p => {
            if (p.start_date) {
                let dateStr = p.start_date;
                // Handle complex date format "start|end" or just simple dates
                if (dateStr && typeof dateStr === 'string') {
                    if (dateStr.includes('|')) {
                        dateStr = dateStr.split('|')[0];
                    }

                    const dateObj = new Date(dateStr);
                    if (!isNaN(dateObj.getTime())) {
                        // const status = statuses?.find(s => s.id === p.status_id);
                        // Force blue color for projects in calendar view for better visibility
                        const bg = '#3b82f6';

                        allEvents.push({
                            id: p.id,
                            title: p.title,
                            date: dateObj,
                            color: bg,
                            textColor: getContrastColor(bg),
                            type: 'project',
                            time: format(dateObj, 'HH:mm')
                        });
                    }
                }
            }
        });

        // 2. Job Transactions (Income with job_date)
        transactions?.forEach(t => {
            if (t.type === 'income' && t.job_date) {
                // Determine color based on whether it has a project or is standalone
                const bg = '#10b981'; // Green for money/jobs
                allEvents.push({
                    id: t.id,
                    title: `${t.title} (Teslim)`,
                    date: new Date(t.job_date),
                    color: bg,
                    textColor: '#ffffff',
                    type: 'job',
                    time: format(new Date(t.job_date), 'HH:mm')
                });
            }
        });

        return allEvents;
    }, [projects, statuses, transactions]);

    // Navigation Logic
    const next = () => {
        if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
        if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
        if (view === 'day') setCurrentDate(addDays(currentDate, 1));
    };

    const prev = () => {
        if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
        if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
        if (view === 'day') setCurrentDate(subDays(currentDate, 1));
    };

    const today = () => setCurrentDate(new Date());

    // Renderers
    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

        return (
            <div className="bg-card rounded-xl border shadow-sm flex-1 flex flex-col overflow-hidden h-full">
                <div className="grid grid-cols-7 border-b bg-muted/40">
                    {weekDays.map(d => (
                        <div key={d} className="p-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                            {d}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                    {days.map((dayItem) => {
                        const dayEvents = events.filter(e => isSameDay(e.date, dayItem));
                        const isCurrentMonth = isSameMonth(dayItem, monthStart);
                        const isToday = isSameDay(dayItem, new Date());

                        return (
                            <div
                                key={dayItem.toString()}
                                className={cn(
                                    "min-h-[100px] p-2 border-b border-r last:border-r-0 transition-colors hover:bg-muted/10 flex flex-col gap-1",
                                    !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                                    isToday && "bg-primary/5 shadow-[inset_0_0_0_1px] shadow-primary/20"
                                )}
                            >
                                <div className="text-right mb-1">
                                    <span className={cn(
                                        "text-sm font-medium inline-flex h-7 w-7 items-center justify-center rounded-full",
                                        isToday && "bg-primary text-primary-foreground"
                                    )}>
                                        {format(dayItem, "d")}
                                    </span>
                                </div>
                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[100px] no-scrollbar">
                                    {dayEvents.map(event => (
                                        <div
                                            key={event.id}
                                            className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium cursor-pointer flex items-center gap-1 border border-white/20 shadow-sm"
                                            style={{
                                                backgroundColor: event.color,
                                                color: event.textColor
                                            }}
                                            title={event.title}
                                        >
                                            <div className="flex-1 truncate flex items-center gap-1">
                                                {event.time && <span className="opacity-75 font-mono text-[9px]">{event.time}</span>}
                                                <span>{event.title}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderDayWeekView = () => {
        // For simplicity, we'll render a vertical list of hours for the day view,
        // and a grid for the week view.
        // Actually, let's consolidate. A standard "Day" view is just a 1-column Week view.

        const viewStart = view === 'week' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfDay(currentDate);
        const viewEnd = view === 'week' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : endOfDay(currentDate);
        const daysToShow = eachDayOfInterval({ start: viewStart, end: viewEnd });
        const hours = Array.from({ length: 24 }).map((_, i) => i); // 0-23 hours

        return (
            <div className="bg-card rounded-xl border shadow-sm flex-1 flex flex-col overflow-hidden h-full">
                {/* Header Row */}
                <div className="flex border-b bg-muted/40">
                    <div className="w-16 border-r flex-shrink-0" /> {/* Time col spacer */}
                    {daysToShow.map(day => (
                        <div key={day.toString()} className="flex-1 p-3 text-center border-r last:border-r-0">
                            <div className="text-sm font-medium text-muted-foreground">{format(day, 'EEE', { locale: tr })}</div>
                            <div className={cn(
                                "text-lg font-bold inline-flex h-8 w-8 items-center justify-center rounded-full mt-1",
                                isSameDay(day, new Date()) && "bg-primary text-primary-foreground"
                            )}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    ))}
                </div>

                {/* All Day / Jobs Section */}
                <div className="flex border-b bg-muted/20 min-h-[40px]">
                    <div className="w-16 border-r flex-shrink-0 flex justify-center items-center text-[10px] text-muted-foreground font-medium p-1 text-center bg-muted/5">
                        Teslimat
                    </div>
                    {daysToShow.map(day => {
                        // Filter for Job/Delivery events for this day
                        const dayJobs = events.filter(e => isSameDay(e.date, day) && e.type === 'job');

                        return (
                            <div key={day.toString()} className="flex-1 border-r last:border-r-0 p-1 flex flex-col gap-1">
                                {dayJobs.map(job => (
                                    <div
                                        key={job.id}
                                        className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium cursor-pointer shadow-sm opacity-90 hover:opacity-100 flex items-center justify-center text-center"
                                        style={{
                                            backgroundColor: job.color,
                                            color: job.textColor
                                        }}
                                        title={job.title}
                                    >
                                        {job.title}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>

                {/* Time Grid (Scrollable) */}
                <div className="flex-1 overflow-y-auto">
                    {hours.map(hour => (
                        <div key={hour} className="flex min-h-[60px] border-b last:border-b-0 relative group">
                            {/* Time Label */}
                            <div className="w-16 border-r flex-shrink-0 flex justify-center items-start pt-2 text-xs text-muted-foreground bg-muted/10 sticky left-0 font-mono">
                                {hour.toString().padStart(2, '0')}:00
                            </div>

                            {/* Days Columns */}
                            {daysToShow.map(day => {
                                // Find events that start in this hour (Projects only)
                                const hourEvents = events.filter(e =>
                                    isSameDay(e.date, day) &&
                                    e.type === 'project' &&
                                    e.date.getHours() === hour
                                );

                                return (
                                    <div key={day.toString()} className="flex-1 border-r last:border-r-0 p-1 relative hover:bg-slate-50 transition-colors">
                                        {hourEvents.map(event => (
                                            <div
                                                key={event.id}
                                                className="mb-1 text-xs p-1.5 rounded shadow-sm cursor-pointer hover:brightness-95 transition-all opacity-90 hover:opacity-100 z-10 border border-white/20"
                                                style={{
                                                    backgroundColor: event.color,
                                                    color: event.textColor,
                                                }}
                                            >
                                                <div className="font-bold flex items-center gap-1">
                                                    {format(event.date, 'HH:mm')}
                                                    <Clock className="w-3 h-3 opacity-50" />
                                                </div>
                                                <div className="truncate">{event.title}</div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col animate-in fade-in duration-500">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Takvim</h2>
                    <p className="text-muted-foreground">Projeler ve teslimat takvimi.</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-card rounded-lg border shadow-sm p-1 flex items-center gap-1 mr-4">
                        <Button
                            variant={view === 'month' ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setView('month')}
                            className="text-xs px-3"
                        >
                            Ay
                        </Button>
                        <Button
                            variant={view === 'week' ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setView('week')}
                            className="text-xs px-3"
                        >
                            Hafta
                        </Button>
                        <Button
                            variant={view === 'day' ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setView('day')}
                            className="text-xs px-3"
                        >
                            Gün
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 bg-card rounded-lg border shadow-sm p-1">
                        <Button variant="ghost" size="icon" onClick={prev}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" className="min-w-[120px] font-semibold" onClick={today}>
                            {view === 'month' && format(currentDate, "MMMM yyyy", { locale: tr })}
                            {view === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: tr })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM yyyy", { locale: tr })}`}
                            {view === 'day' && format(currentDate, "d MMMM yyyy, EEEE", { locale: tr })}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={next}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            {view === 'month' ? renderMonthView() : renderDayWeekView()}
        </div>
    );
}
