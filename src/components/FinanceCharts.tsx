import { useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import type { Transaction } from '../types';
import { format, parseISO, eachDayOfInterval, eachMonthOfInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isSameDay, isSameMonth } from 'date-fns';
import { tr } from 'date-fns/locale';

interface FinanceChartsProps {
    transactions: Transaction[];
    period: 'day' | 'week' | 'month' | 'year' | 'all';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function FinanceCharts({ transactions, period }: FinanceChartsProps) {
    // 1. Data for Bar & Line Charts (Trends)
    const trendData = useMemo(() => {
        if (!transactions.length) return [];

        // Determine range and grouping based on period
        let start: Date, end: Date;
        const now = new Date();

        if (period === 'day') {
            start = startOfDay(now);
            end = endOfDay(now);
            // interval = 'hour'; // Removed unused
            return [{
                name: format(now, 'dd MMM', { locale: tr }),
                Gelir: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
                Gider: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
                Net: transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)
            }];
        } else if (period === 'week') {
            start = startOfWeek(now, { weekStartsOn: 1 });
            end = endOfWeek(now, { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start, end });
            return days.map(day => {
                const daily = transactions.filter(t => isSameDay(parseISO(t.date), day));
                const income = daily.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                const expense = daily.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                return {
                    name: format(day, 'EEE', { locale: tr }),
                    Gelir: income,
                    Gider: expense,
                    Net: income - expense
                };
            });
        } else if (period === 'month') {
            start = startOfMonth(now);
            end = endOfMonth(now);
            const days = eachDayOfInterval({ start, end });
            return days.map(day => {
                const daily = transactions.filter(t => isSameDay(parseISO(t.date), day));
                const income = daily.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                const expense = daily.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                return {
                    name: format(day, 'd', { locale: tr }),
                    Gelir: income,
                    Gider: expense,
                    Net: income - expense
                };
            });
        } else {
            // Year or All (defaulting to current year breakdown)
            start = startOfYear(now);
            end = endOfYear(now);
            const months = eachMonthOfInterval({ start, end });
            return months.map(month => {
                const monthly = transactions.filter(t => isSameMonth(parseISO(t.date), month));
                const income = monthly.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                const expense = monthly.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                return {
                    name: format(month, 'MMM', { locale: tr }),
                    Gelir: income,
                    Gider: expense,
                    Net: income - expense
                };
            });
        }
    }, [transactions, period]);

    // 2. Data for Pie Chart (Expense Categories)
    const categoryData = useMemo(() => {
        const expenses = transactions.filter(t => t.type === 'expense');
        const categories: Record<string, number> = {};

        expenses.forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + t.amount;
        });

        return Object.entries(categories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    // 3. Data for Pie Chart (Income Categories)
    const incomeCategoryData = useMemo(() => {
        const incomes = transactions.filter(t => t.type === 'income');
        const categories: Record<string, number> = {};

        incomes.forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + t.amount;
        });

        return Object.entries(categories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Bar Chart: Income vs Expense */}
            <div className="bg-card rounded-xl border p-4 shadow-sm">
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Gelir / Gider Dengesi</h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₺${v}`} />
                            <Tooltip formatter={(v: number) => `₺${v.toLocaleString('tr-TR')}`} cursor={{ fill: 'transparent' }} />
                            <Legend />
                            <Bar dataKey="Gelir" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Line Chart: Net Profit Trend */}
            <div className="bg-card rounded-xl border p-4 shadow-sm">
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Net Kar Trendi</h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₺${v}`} />
                            <Tooltip formatter={(v: number) => `₺${v.toLocaleString('tr-TR')}`} />
                            <Legend />
                            <Line type="monotone" dataKey="Net" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Pie Chart: Income Breakdown */}
            <div className="bg-card rounded-xl border p-4 shadow-sm">
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Gelir Dağılımı</h3>
                <div className="h-[250px] w-full flex items-center justify-center">
                    {incomeCategoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={incomeCategoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#22c55e"
                                    dataKey="value"
                                >
                                    {incomeCategoryData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: number) => `₺${v.toLocaleString('tr-TR')}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-muted-foreground text-sm">Bu dönemde gelir kaydı bulunmuyor.</div>
                    )}
                </div>
            </div>

            {/* 4. Pie Chart: Expense Breakdown */}
            <div className="bg-card rounded-xl border p-4 shadow-sm">
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Gider Dağılımı</h3>
                <div className="h-[250px] w-full flex items-center justify-center">
                    {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#ef4444"
                                    dataKey="value"
                                >
                                    {categoryData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: number) => `₺${v.toLocaleString('tr-TR')}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-muted-foreground text-sm">Bu dönemde gider kaydı bulunmuyor.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

