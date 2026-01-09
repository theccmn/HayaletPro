import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import type { Transaction } from '../types';
import { format, parseISO, eachDayOfInterval, subDays, eachMonthOfInterval, subMonths, isSameDay, isSameMonth } from 'date-fns';
import { tr } from 'date-fns/locale';

interface FinanceChartsProps {
    transactions: Transaction[];
    period: 'week' | 'month' | 'year';
}

export function FinanceCharts({ transactions, period }: FinanceChartsProps) {
    const data = useMemo(() => {
        if (period === 'week') {
            const end = new Date();
            const start = subDays(end, 6); // Last 7 days
            const days = eachDayOfInterval({ start, end });

            return days.map(day => {
                const dayTransactions = transactions.filter(t => isSameDay(parseISO(t.date), day));
                const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                return {
                    name: format(day, 'EEE', { locale: tr }),
                    Gelir: income,
                    Gider: expense,
                    date: day
                };
            });
        } else if (period === 'month') {
            const end = new Date();
            // Let's do last 30 days for better trend
            const start30 = subDays(end, 29);
            const days30 = eachDayOfInterval({ start: start30, end });

            return days30.map(day => {
                const dayTransactions = transactions.filter(t => isSameDay(parseISO(t.date), day));
                const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                return {
                    name: format(day, 'd MMM', { locale: tr }),
                    Gelir: income,
                    Gider: expense,
                    date: day
                };
            });
        } else {
            // Year: Last 12 months
            const end = new Date();
            const start = subMonths(end, 11);
            const months = eachMonthOfInterval({ start, end });

            return months.map(month => {
                const monthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), month));
                const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                return {
                    name: format(month, 'MMM', { locale: tr }),
                    Gelir: income,
                    Gider: expense,
                    date: month
                };
            });
        }
    }, [transactions, period]);

    return (
        <div className="w-full h-[350px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="name"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₺${value}`}
                    />
                    <Tooltip
                        formatter={(value: number) => `₺${value.toLocaleString('tr-TR')}`}
                        cursor={{ fill: 'transparent' }}
                    />
                    <Legend />
                    <Bar dataKey="Gelir" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
