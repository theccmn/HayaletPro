import { useMemo, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import type { Transaction } from '../../types';
import {
    format,
    parseISO,
    eachDayOfInterval,
    eachMonthOfInterval,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    isSameDay,
    isSameMonth,
    isWithinInterval,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';
import { TimeFilterButtons } from './TimeFilterButtons';
import type { TimeFilter } from '../../utils/dateFilters';
import { Link } from 'react-router-dom';

interface DashboardIncomeChartProps {
    transactions: Transaction[];
}

export function DashboardIncomeChart({ transactions }: DashboardIncomeChartProps) {
    const [period, setPeriod] = useState<TimeFilter>('week');

    const chartData = useMemo(() => {
        if (!transactions.length) return [];

        const now = new Date();
        let start: Date, end: Date;

        if (period === 'day') {
            start = startOfDay(now);
            end = endOfDay(now);
            // Group by hour - simplified for dashboard
            const hourlyData = [];
            for (let hour = 0; hour < 24; hour++) {
                const hourStart = new Date(now);
                hourStart.setHours(hour, 0, 0, 0);
                const hourEnd = new Date(now);
                hourEnd.setHours(hour, 59, 59, 999);

                const hourTransactions = transactions.filter((t) => {
                    const tDate = parseISO(t.date);
                    return isWithinInterval(tDate, { start: hourStart, end: hourEnd });
                });

                const income = hourTransactions
                    .filter((t) => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);

                hourlyData.push({
                    name: `${hour.toString().padStart(2, '0')}:00`,
                    Gelir: income,
                });
            }
            return hourlyData;
        } else if (period === 'week') {
            start = startOfWeek(now, { weekStartsOn: 1 });
            end = endOfWeek(now, { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start, end });
            return days.map((day) => {
                const daily = transactions.filter((t) => isSameDay(parseISO(t.date), day));
                const income = daily
                    .filter((t) => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);
                return {
                    name: format(day, 'EEE', { locale: tr }),
                    Gelir: income,
                };
            });
        } else if (period === 'month') {
            start = startOfMonth(now);
            end = endOfMonth(now);
            const days = eachDayOfInterval({ start, end });
            return days.map((day) => {
                const daily = transactions.filter((t) => isSameDay(parseISO(t.date), day));
                const income = daily
                    .filter((t) => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);
                return {
                    name: format(day, 'd', { locale: tr }),
                    Gelir: income,
                };
            });
        } else {
            // Year or All
            start = startOfYear(now);
            end = endOfYear(now);
            const months = eachMonthOfInterval({ start, end });
            return months.map((month) => {
                const monthly = transactions.filter((t) => isSameMonth(parseISO(t.date), month));
                const income = monthly
                    .filter((t) => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);
                return {
                    name: format(month, 'MMM', { locale: tr }),
                    Gelir: income,
                };
            });
        }
    }, [transactions, period]);

    const totalIncome = chartData.reduce((sum, d) => sum + d.Gelir, 0);

    return (
        <div className="rounded-2xl border bg-card p-4 shadow-sm h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <h3 className="font-semibold">Gelir Grafiği</h3>
                </div>

                <TimeFilterButtons value={period} onChange={setPeriod} size="sm" />
            </div>

            {/* Total */}
            <div className="mb-4">
                <div className="text-2xl font-bold text-green-600">
                    ₺{totalIncome.toLocaleString('tr-TR')}
                </div>
                <div className="text-xs text-muted-foreground">
                    {period === 'day' && 'Bugünkü gelir'}
                    {period === 'week' && 'Bu hafta'}
                    {period === 'month' && 'Bu ay'}
                    {period === 'year' && 'Bu yıl'}
                    {period === 'all' && 'Toplam'}
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis
                            dataKey="name"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#9ca3af' }}
                        />
                        <YAxis
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#9ca3af' }}
                            tickFormatter={(v) => `₺${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                        />
                        <Tooltip
                            formatter={(v: number) => [`₺${v.toLocaleString('tr-TR')}`, 'Gelir']}
                            contentStyle={{
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="Gelir"
                            stroke="#22c55e"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorGelir)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Footer Link */}
            <Link
                to="/finance"
                className="mt-3 text-xs text-center text-primary hover:underline font-medium"
            >
                Finansal Raporları Görüntüle →
            </Link>
        </div>
    );
}
