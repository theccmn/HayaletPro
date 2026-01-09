import { useQuery } from '@tanstack/react-query';
import { getTransactions } from '../services/apiFinance';
import { Loader2, Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { TransactionDialog } from '../components/TransactionDialog';
import { FinanceCharts } from '../components/FinanceCharts';

export default function Finance() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('month');
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

    const { data: transactions, isLoading } = useQuery({
        queryKey: ['transactions'],
        queryFn: getTransactions,
    });

    const totalIncome = transactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    const totalExpense = transactions
        ?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    const netProfit = totalIncome - totalExpense;

    const filteredTransactions = transactions?.filter(t => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        return true;
    });

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Finans Yönetimi</h1>
                    <p className="text-muted-foreground">Gelir, gider ve nakit akışınızı takip edin.</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> Yeni İşlem Ekle
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Toplam Gelir</h3>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                        ₺{totalIncome.toLocaleString('tr-TR')}
                    </div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Toplam Gider</h3>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                        ₺{totalExpense.toLocaleString('tr-TR')}
                    </div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Net Durum</h3>
                        <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <div className={cn("text-2xl font-bold", netProfit >= 0 ? "text-primary" : "text-red-600")}>
                        ₺{netProfit.toLocaleString('tr-TR')}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold leading-none tracking-tight">Finansal Analiz</h3>
                    <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                        {(['week', 'month', 'year'] as const).map((period) => (
                            <button
                                key={period}
                                onClick={() => setChartPeriod(period)}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                    chartPeriod === period ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                                )}
                            >
                                {period === 'week' ? 'Haftalık' : period === 'month' ? 'Aylık' : 'Yıllık'}
                            </button>
                        ))}
                    </div>
                </div>
                <FinanceCharts transactions={transactions || []} period={chartPeriod} />
            </div>

            {/* Transactions List */}
            <div className="rounded-md border bg-card">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Son İşlemler</h3>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
                            <button
                                onClick={() => setTypeFilter('all')}
                                className={cn("px-3 py-1 text-xs rounded-sm transition-all", typeFilter === 'all' ? "bg-background shadow-sm" : "hover:bg-background/50")}
                            >
                                Tümü
                            </button>
                            <button
                                onClick={() => setTypeFilter('income')}
                                className={cn("px-3 py-1 text-xs rounded-sm transition-all text-green-600", typeFilter === 'income' ? "bg-background shadow-sm font-medium" : "hover:bg-background/50")}
                            >
                                Gelirler
                            </button>
                            <button
                                onClick={() => setTypeFilter('expense')}
                                className={cn("px-3 py-1 text-xs rounded-sm transition-all text-red-600", typeFilter === 'expense' ? "bg-background shadow-sm font-medium" : "hover:bg-background/50")}
                            >
                                Giderler
                            </button>
                        </div>
                    </div>
                </div>
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">İşlem</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Kategori</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Tür</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Proje</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Tarih</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Tutar</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {filteredTransactions?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-4 text-center text-muted-foreground">
                                        Kayıt bulunamadı.
                                    </td>
                                </tr>
                            ) : filteredTransactions?.map((transaction) => (
                                <tr key={transaction.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <td className="p-4 align-middle font-medium">{transaction.title}</td>
                                    <td className="p-4 align-middle">
                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                            {transaction.category}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <span className={cn(
                                            "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                                            transaction.type === 'income'
                                                ? "bg-green-50 text-green-700 ring-green-600/20"
                                                : "bg-red-50 text-red-700 ring-red-600/20"
                                        )}>
                                            {transaction.type === 'income' ? 'Gelir' : 'Gider'}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle text-muted-foreground">
                                        {transaction.projects?.title || '-'}
                                    </td>
                                    <td className="p-4 align-middle text-muted-foreground">
                                        {format(new Date(transaction.date), 'd MMM yyyy', { locale: tr })}
                                    </td>
                                    <td className={cn(
                                        "p-4 align-middle text-right font-medium",
                                        transaction.type === 'income' ? "text-green-600" : "text-red-600"
                                    )}>
                                        {transaction.type === 'income' ? '+' : '-'}₺{transaction.amount.toLocaleString('tr-TR')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <TransactionDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
        </div>
    );
}
