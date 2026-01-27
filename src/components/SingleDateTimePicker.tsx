import { useState, useMemo } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
    isValid
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Clock, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

interface SingleDateTimePickerProps {
    date?: Date;
    onChange: (date: Date | undefined) => void;
}

// Çalışma saatleri
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 24;

const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = WORK_START_HOUR; hour <= WORK_END_HOUR; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
};

const TIME_SLOTS = generateTimeSlots();

export function SingleDateTimePicker({ date, onChange }: SingleDateTimePickerProps) {
    const [currentMonth, setCurrentMonth] = useState(() => date || new Date());
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(date);

    // Eğer bir tarih seçiliyse, saatini string olarak al (HH:mm)
    const [selectedTime, setSelectedTime] = useState<string | null>(() => {
        if (date && isValid(date)) {
            return format(date, 'HH:mm');
        }
        return '09:00'; // Varsayılan saat
    });

    // Takvim günlerini oluştur
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentMonth]);

    const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);

        // Yeni tarihi oluştururken mevcut saati koru
        if (selectedTime) {
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const newDate = new Date(day);
            newDate.setHours(hours, minutes, 0, 0);
            onChange(newDate);
        } else {
            // Saat seçili değilse varsayılan 09:00 ile gönder
            const newDate = new Date(day);
            newDate.setHours(9, 0, 0, 0);
            setSelectedTime('09:00');
            onChange(newDate);
        }
    };

    const handleTimeClick = (time: string) => {
        setSelectedTime(time);

        if (selectedDate) {
            const [hours, minutes] = time.split(':').map(Number);
            const newDate = new Date(selectedDate);
            newDate.setHours(hours, minutes, 0, 0);
            onChange(newDate);
        }
    };

    return (
        <div className="flex flex-col sm:flex-row w-full max-w-[600px] h-[350px]">
            {/* Sol Panel - Takvim */}
            <div className="flex-1 p-3 border-r flex flex-col">
                {/* Ay Navigasyonu */}
                <div className="flex items-center justify-between mb-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium text-sm">
                        {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Hafta Günleri */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Günler */}
                <div className="grid grid-cols-7 gap-1 flex-1 content-start">
                    {calendarDays.map(day => {
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isToday = isSameDay(day, new Date());
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                        return (
                            <button
                                key={day.toString()}
                                type="button"
                                disabled={isPast}
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                    "relative h-8 w-full rounded-md text-xs font-medium transition-all flex items-center justify-center",
                                    "hover:bg-primary/10 focus:outline-none focus:ring-1 focus:ring-primary/20",
                                    !isCurrentMonth && "text-muted-foreground/30",
                                    isToday && !isSelected && "text-primary font-bold bg-primary/5 ring-1 ring-inset ring-primary/20",
                                    isSelected && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm scale-110 z-10",
                                    isPast && "opacity-30 cursor-not-allowed hover:bg-transparent text-muted-foreground"
                                )}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Sağ Panel - Saatler */}
            <div className="w-full sm:w-32 bg-muted/5 flex flex-col p-2 border-l">
                <div className="mb-2 px-1">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Saat Seçin
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-1">
                    {TIME_SLOTS.map(time => (
                        <button
                            key={time}
                            type="button"
                            onClick={() => handleTimeClick(time)}
                            className={cn(
                                "w-full py-1.5 px-2 text-xs rounded-md border transition-all text-center",
                                time === selectedTime
                                    ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm"
                                    : "bg-background hover:bg-muted text-foreground border-transparent hover:border-border"
                            )}
                        >
                            {time}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
