import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../services/apiProjects';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
    parseISO, isValid
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Clock, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

interface DateTimePickerProps {
    value?: string; // Format: "2026-01-09T10:00|2026-01-09T15:00" (başlangıç | bitiş)
    onChange: (value: string) => void;
}

// Çalışma saatleri
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 24; // Gece 00:00

// Saat slotlarını oluştur
const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = WORK_START_HOUR; hour <= WORK_END_HOUR; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Saat string'ini dakika cinsine çevir
const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
    // Value'dan başlangıç ve bitiş saatlerini parse et
    const parseValue = (val?: string) => {
        if (!val) return { date: null, startTime: null, endTime: null };

        const parts = val.split('|');
        const startPart = parts[0]?.trim();
        const endPart = parts[1]?.trim();

        let date: Date | null = null;
        let startTime: string | null = null;
        let endTime: string | null = null;

        if (startPart) {
            const parsed = parseISO(startPart);
            if (isValid(parsed)) {
                date = parsed;
                startTime = format(parsed, 'HH:mm');
            }
        }

        if (endPart) {
            const parsed = parseISO(endPart);
            if (isValid(parsed)) {
                endTime = format(parsed, 'HH:mm');
            }
        }

        return { date, startTime, endTime };
    };

    const initialValues = parseValue(value);

    const [currentMonth, setCurrentMonth] = useState(() => initialValues.date || new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(initialValues.date);
    const [startTime, setStartTime] = useState<string | null>(initialValues.startTime);
    const [endTime, setEndTime] = useState<string | null>(initialValues.endTime);

    // Mevcut projeleri çek
    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    // Dolu zaman aralıklarını hesapla
    const busySlots = useMemo(() => {
        const slots: { date: string; startTime: string; endTime: string }[] = [];
        projects?.forEach(p => {
            if (p.start_date) {
                try {
                    // Yeni yapı: start_date ve end_date ayrı kolonlar
                    if (p.end_date) {
                        const startParsed = parseISO(p.start_date);
                        const endParsed = parseISO(p.end_date);

                        if (isValid(startParsed) && isValid(endParsed)) {
                            slots.push({
                                date: format(startParsed, 'yyyy-MM-dd'),
                                startTime: format(startParsed, 'HH:mm'),
                                endTime: format(endParsed, 'HH:mm')
                            });
                        }
                    }
                    // Eski yapı veya farklı format kontrolü (fallback)
                    else {
                        const parts = p.start_date.split('|');
                        if (parts.length === 2) {
                            const startParsed = parseISO(parts[0].trim());
                            const endParsed = parseISO(parts[1].trim());
                            if (isValid(startParsed) && isValid(endParsed)) {
                                slots.push({
                                    date: format(startParsed, 'yyyy-MM-dd'),
                                    startTime: format(startParsed, 'HH:mm'),
                                    endTime: format(endParsed, 'HH:mm')
                                });
                            }
                        } else {
                            // Tek saat (eski kayıtlar) - varsayılan 1 saat ekle
                            const parsed = parseISO(p.start_date);
                            if (isValid(parsed)) {
                                const time = format(parsed, 'HH:mm');
                                slots.push({
                                    date: format(parsed, 'yyyy-MM-dd'),
                                    startTime: time,
                                    endTime: `${(parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0')}:00`
                                });
                            }
                        }
                    }
                } catch {
                    // Invalid date format, skip
                }
            }
        });
        return slots;
    }, [projects]);

    // Seçilen gündeki dolu saatler
    const getBusyTimesForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return busySlots.filter(s => s.date === dateStr);
    };

    // Bir saatin dolu olup olmadığını kontrol et
    const isTimeBusy = (time: string) => {
        if (!selectedDate) return false;
        const busyRanges = getBusyTimesForDate(selectedDate);
        const timeMinutes = timeToMinutes(time);

        return busyRanges.some(range => {
            const rangeStart = timeToMinutes(range.startTime);
            const rangeEnd = timeToMinutes(range.endTime);
            return timeMinutes >= rangeStart && timeMinutes < rangeEnd;
        });
    };

    // Takvim günlerini oluştur
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentMonth]);

    // Gün seçimi
    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        setStartTime(null);
        setEndTime(null);
    };

    // Saat seçimi
    const handleTimeClick = (time: string) => {
        if (!selectedDate) return;

        if (!startTime) {
            // İlk tıklama: Başlangıç saati
            setStartTime(time);
            setEndTime(null);
        } else if (!endTime) {
            // İkinci tıklama: Bitiş saati
            const startMinutes = timeToMinutes(startTime);
            const clickedMinutes = timeToMinutes(time);

            if (clickedMinutes > startMinutes) {
                setEndTime(time);
                // Değeri kaydet
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                onChange(`${dateStr}T${startTime}:00|${dateStr}T${time}:00`);
            } else {
                // Tıklanan saat başlangıçtan önce ise, yeni başlangıç olarak ayarla
                setStartTime(time);
                setEndTime(null);
            }
        } else {
            // Her ikisi de seçili ise, yeniden başla
            setStartTime(time);
            setEndTime(null);
        }
    };

    // Bir saatin seçili aralıkta olup olmadığını kontrol et
    const isTimeInSelectedRange = (time: string) => {
        if (!startTime) return false;
        const timeMinutes = timeToMinutes(time);
        const startMinutes = timeToMinutes(startTime);

        if (endTime) {
            const endMinutes = timeToMinutes(endTime);
            return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
        }

        return time === startTime;
    };

    // Gündeki etkinlik sayısı
    const getEventCountForDay = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return busySlots.filter(s => s.date === dateStr).length;
    };

    // Süreyi hesapla
    const calculateDuration = () => {
        if (!startTime || !endTime) return null;
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        const duration = endMinutes - startMinutes;
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        if (minutes === 0) return `${hours} saat`;
        return `${hours} saat ${minutes} dk`;
    };

    const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    return (
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Tarih ve saat aralığı
                </h3>
                <p className="text-sm text-muted-foreground">Önce başlangıç, sonra bitiş saatini seçin.</p>
            </div>

            <div className="flex flex-col lg:flex-row">
                {/* Sol Panel - Takvim */}
                <div className="flex-1 p-4 border-r">
                    {/* Ay Navigasyonu */}
                    <div className="flex items-center justify-between mb-4">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-medium">
                            {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Hafta Günleri */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Günler */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map(day => {
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const isToday = isSameDay(day, new Date());
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const eventCount = getEventCountForDay(day);
                            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                            return (
                                <button
                                    key={day.toString()}
                                    type="button"
                                    disabled={isPast}
                                    onClick={() => handleDayClick(day)}
                                    className={cn(
                                        "relative h-10 w-full rounded-lg text-sm font-medium transition-all",
                                        "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20",
                                        !isCurrentMonth && "text-muted-foreground/50",
                                        isToday && !isSelected && "ring-1 ring-primary text-primary",
                                        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                                        isPast && "opacity-40 cursor-not-allowed hover:bg-transparent",
                                        eventCount > 0 && !isSelected && "text-red-600"
                                    )}
                                >
                                    {format(day, 'd')}
                                    {eventCount > 0 && (
                                        <span className={cn(
                                            "absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                                            isSelected ? "bg-primary-foreground" : "bg-primary"
                                        )} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Bugün butonu */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-4 w-full"
                        onClick={() => {
                            setCurrentMonth(new Date());
                            setSelectedDate(new Date());
                        }}
                    >
                        Bugün
                    </Button>
                </div>

                {/* Sağ Panel - Saat Slotları */}
                <div className="w-full lg:w-64 p-4 bg-muted/10">
                    {selectedDate ? (
                        <>
                            <div className="mb-3">
                                <p className="text-sm font-medium">
                                    {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {!startTime ? "Başlangıç saatini seçin" :
                                        !endTime ? "Bitiş saatini seçin" :
                                            "Aralık seçildi"}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
                                {TIME_SLOTS.map(time => {
                                    const isBusy = isTimeBusy(time);
                                    const isInRange = isTimeInSelectedRange(time);
                                    const isStart = time === startTime;
                                    const isEnd = time === endTime;

                                    return (
                                        <button
                                            key={time}
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => handleTimeClick(time)}
                                            className={cn(
                                                "flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                                "border hover:border-primary/50",
                                                // Başlangıç veya bitiş
                                                (isStart || isEnd) && "bg-primary text-primary-foreground border-primary",
                                                // Aralıkta ama uç değil
                                                isInRange && !isStart && !isEnd && "bg-primary/30 text-primary border-primary/50",
                                                // Müsait
                                                !isInRange && !isBusy && "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
                                                // Dolu
                                                isBusy && "bg-red-50 text-red-400 border-red-200 cursor-not-allowed opacity-60"
                                            )}
                                        >
                                            <Clock className="h-3 w-3" />
                                            {time}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Seçilen Aralık */}
                            {startTime && (
                                <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-primary/70">Seçilen aralık</p>
                                            <p className="text-sm font-bold text-primary">
                                                {startTime} - {endTime || "?"}
                                            </p>
                                        </div>
                                        {calculateDuration() && (
                                            <div className="text-right">
                                                <p className="text-xs text-primary/70">Süre</p>
                                                <p className="text-sm font-bold text-primary">
                                                    {calculateDuration()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-primary/70 mt-1">
                                        {format(selectedDate, 'd MMM yyyy', { locale: tr })}
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Müsait saatleri görmek için bir tarih seçin
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Alt Panel - Haftalık Saat Bazlı Takvim */}
            {selectedDate && (
                <div className="border-t p-4 bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-muted-foreground">
                            Haftaya genel bakış
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMM', { locale: tr })} - {format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMM', { locale: tr })}
                        </p>
                    </div>

                    {/* Grid Takvim */}
                    <div className="overflow-x-auto">
                        <div className="min-w-[600px]">
                            {/* Header - Günler */}
                            <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-px bg-border rounded-t-lg overflow-hidden">
                                <div className="bg-muted/50 p-2 text-xs font-medium text-muted-foreground text-center">
                                    SAAT
                                </div>
                                {eachDayOfInterval({
                                    start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
                                    end: endOfWeek(selectedDate, { weekStartsOn: 1 })
                                }).map(day => {
                                    const isSelectedDay = selectedDate && isSameDay(day, selectedDate);
                                    const isToday = isSameDay(day, new Date());
                                    return (
                                        <button
                                            key={day.toString()}
                                            type="button"
                                            onClick={() => handleDayClick(day)}
                                            className={cn(
                                                "p-2 text-center transition-all border-r border-border/50 last:border-r-0",
                                                isSelectedDay ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted",
                                                isToday && !isSelectedDay && "ring-1 ring-primary ring-inset"
                                            )}
                                        >
                                            <div className="text-[10px] font-medium uppercase">{format(day, 'EEE', { locale: tr })}</div>
                                            <div className="text-xs font-bold">{format(day, 'd/MM')}</div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Body - Saat Satırları */}
                            <div className="relative bg-card border border-t-0 rounded-b-lg overflow-hidden">
                                {/* Saat satırları - 08:00 - 00:00 */}
                                {[8, 10, 12, 14, 16, 18, 20, 22].map(hour => (
                                    <div key={hour} className="grid grid-cols-[50px_repeat(7,1fr)] gap-px border-b last:border-b-0">
                                        <div className="bg-muted/30 p-1 text-[10px] text-muted-foreground text-center flex items-center justify-center">
                                            {hour.toString().padStart(2, '0')}:00
                                        </div>
                                        {eachDayOfInterval({
                                            start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
                                            end: endOfWeek(selectedDate, { weekStartsOn: 1 })
                                        }).map(day => {
                                            const dayBusySlots = getBusyTimesForDate(day);
                                            const isSelectedDay = selectedDate && isSameDay(day, selectedDate);

                                            // Bu saat diliminde (hour - hour+2) olan randevuları bul
                                            const slotsInHour = dayBusySlots.filter(slot => {
                                                const slotStartHour = parseInt(slot.startTime.split(':')[0]);
                                                return slotStartHour >= hour && slotStartHour < hour + 2;
                                            });

                                            return (
                                                <div
                                                    key={`${day.toString()}-${hour}`}
                                                    onClick={() => handleDayClick(day)}
                                                    className={cn(
                                                        "min-h-[40px] p-0.5 relative cursor-pointer transition-all hover:bg-muted/30 border-r border-border/50 last:border-r-0",
                                                        isSelectedDay && "bg-primary/5"
                                                    )}
                                                >
                                                    {slotsInHour.map((slot, idx) => {
                                                        // Randevu bloğunu render et
                                                        const project = projects?.find(p => {
                                                            if (!p.start_date) return false;
                                                            const pDate = format(parseISO(p.start_date), 'yyyy-MM-dd');
                                                            const dayDate = format(day, 'yyyy-MM-dd');
                                                            const pTime = format(parseISO(p.start_date), 'HH:mm');
                                                            return pDate === dayDate && pTime === slot.startTime;
                                                        });

                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="bg-teal-100 border-l-2 border-teal-500 rounded-r px-1 py-0.5 text-[9px] text-teal-800 truncate mb-0.5"
                                                                title={`${slot.startTime} - ${slot.endTime}${project?.client_name ? ` | ${project.client_name}` : ''}`}
                                                            >
                                                                <span className="font-medium">{slot.startTime}</span>
                                                                {project?.client_name && (
                                                                    <span className="block truncate">{project.client_name}</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
