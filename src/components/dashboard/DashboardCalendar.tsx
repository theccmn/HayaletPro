import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../../services/apiProjects';
import { getTransactions } from '../../services/apiFinance';
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    addDays,
    subDays,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

type CalendarView = 'day' | 'week' | 'month';

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    type: 'project' | 'job';
    time?: string;
}

export function DashboardCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarView>('day');

    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    const { data: transactions } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => getTransactions(),
    });

    // Process events
    const events = useMemo(() => {
        const allEvents: CalendarEvent[] = [];

        // Projects
        projects?.forEach((p) => {
            if (p.start_date) {
                let dateStr = p.start_date;
                if (dateStr && typeof dateStr === 'string') {
                    if (dateStr.includes('|')) {
                        dateStr = dateStr.split('|')[0];
                    }

                    let dateObj: Date;
                    if (dateStr.length === 10 && dateStr.includes('-')) {
                        const [year, month, day] = dateStr.split('-').map(Number);
                        dateObj = new Date(year, month - 1, day);
                    } else {
                        dateObj = new Date(dateStr);
                    }

                    if (!isNaN(dateObj.getTime())) {
                        allEvents.push({
                            id: p.id,
                            title: p.title,
                            date: dateObj,
                            type: 'project',
                            time: format(dateObj, 'HH:mm'),
                        });
                    }
                }
            }
        });

        // Job Transactions
        transactions?.forEach((t) => {
            if (t.type === 'income' && t.job_date) {
                allEvents.push({
                    id: t.id,
                    title: `${t.title} (Teslim)`,
                    date: new Date(t.job_date),
                    type: 'job',
                    time: format(new Date(t.job_date), 'HH:mm'),
                });
            }
        });

        return allEvents;
    }, [projects, transactions]);

    // Get events for display
    const displayEvents = useMemo(() => {
        if (view === 'day') {
            return events.filter((e) => isSameDay(e.date, currentDate));
        } else if (view === 'week') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            return events.filter((e) => e.date >= start && e.date <= end);
        } else {
            // Month - show first 10
            return events.slice(0, 10);
        }
    }, [events, currentDate, view]);

    const next = () => {
        if (view === 'day') setCurrentDate(addDays(currentDate, 1));
        else if (view === 'week') setCurrentDate(addDays(currentDate, 7));
        else setCurrentDate(addDays(currentDate, 30));
    };

    const prev = () => {
        if (view === 'day') setCurrentDate(subDays(currentDate, 1));
        else if (view === 'week') setCurrentDate(subDays(currentDate, 7));
        else setCurrentDate(subDays(currentDate, 30));
    };

    const getDateLabel = () => {
        if (view === 'day') {
            return format(currentDate, 'd MMMM, EEEE', { locale: tr });
        } else if (view === 'week') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            return `${format(start, 'd MMM', { locale: tr })} - ${format(end, 'd MMM', { locale: tr })}`;
        }
        return format(currentDate, 'MMMM yyyy', { locale: tr });
    };

    // Week view days
    const weekDays = useMemo(() => {
        if (view !== 'week') return [];
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentDate, view]);

    return (
        <div className="rounded-2xl border bg-card p-4 shadow-sm h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Takvim</h3>
                </div>

                {/* View Selector */}
                <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
                    {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={cn(
                                'px-2 py-1 text-xs font-medium rounded-md transition-all',
                                view === v
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            )}
                        >
                            {v === 'day' ? 'Gün' : v === 'week' ? 'Hafta' : 'Ay'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={prev} className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">{getDateLabel()}</span>
                <Button variant="ghost" size="icon" onClick={next} className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Week View Header */}
            {view === 'week' && (
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day) => (
                        <div
                            key={day.toString()}
                            className={cn(
                                'text-center p-1 rounded-lg text-xs',
                                isSameDay(day, new Date()) && 'bg-primary/10'
                            )}
                        >
                            <div className="text-muted-foreground">{format(day, 'EEE', { locale: tr })}</div>
                            <div
                                className={cn(
                                    'font-semibold',
                                    isSameDay(day, new Date()) && 'text-primary'
                                )}
                            >
                                {format(day, 'd')}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Events List */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[150px]">
                {displayEvents.length > 0 ? (
                    displayEvents.map((event) => (
                        <Link
                            key={event.id}
                            to={event.type === 'project' ? `/projects/${event.id}` : '/calendar'}
                            className={cn(
                                'flex items-center gap-2 p-2 rounded-lg border text-sm transition-all hover:shadow-sm',
                                event.type === 'project'
                                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                    : 'bg-green-50 border-green-200 hover:bg-green-100'
                            )}
                        >
                            <div
                                className={cn(
                                    'h-2 w-2 rounded-full',
                                    event.type === 'project' ? 'bg-blue-500' : 'bg-green-500'
                                )}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{event.title}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {event.time}
                                    {view !== 'day' && (
                                        <span className="ml-1">
                                            - {format(event.date, 'd MMM', { locale: tr })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <Calendar className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Bu dönemde etkinlik yok</p>
                    </div>
                )}
            </div>

            {/* Footer Link */}
            <Link
                to="/calendar"
                className="mt-3 text-xs text-center text-primary hover:underline font-medium"
            >
                Tüm Takvimi Görüntüle →
            </Link>
        </div>
    );
}
