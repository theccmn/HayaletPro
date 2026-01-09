import { useQuery } from '@tanstack/react-query';
import { getExpenses } from '../services/apiExpenses';
import { getProjects } from '../services/apiProjects';
import { Loader2, Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { ExpenseDialog } from '../components/ExpenseDialog';

export default function Expenses() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
        queryKey: ['expenses'],
        queryFn: getExpenses,
    });

    const { data: projects, isLoading: isLoadingProjects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    const isLoading = isLoadingExpenses || isLoadingProjects;

    const totalIncome = projects?.reduce((sum, p) => sum + (p.price || 0), 0) || 0;
    const totalExpense = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const netProfit = totalIncome - totalExpense;

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
                    <h1 className="text-3xl font-bold tracking-tight">Muhasebe</h1>
                    <p className="text-muted-foreground">Gelir ve giderlerinizi takip edin.</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Yeni Gider
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
                    <p className="text-xs text-muted-foreground">
                        {projects?.length} projeden
                    </p>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Toplam Gider</h3>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                        ₺{totalExpense.toLocaleString('tr-TR')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {expenses?.length} işlemden
                    </p>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Net Kâr</h3>
                        <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <div className={cn("text-2xl font-bold", netProfit >= 0 ? "text-primary" : "text-red-600")}>
                        ₺{netProfit.toLocaleString('tr-TR')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Güncel bakiye
                    </p>
                </div>
            </div>

            {/* Expenses List */}
            <div className="rounded-md border">
                <div className="p-4 border-b bg-muted/40">
                    <h3 className="font-semibold">Son İşlemler</h3>
                </div>
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Başlık</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Kategori</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Proje</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Tarih</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Tutar</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {expenses?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                        Henüz kaydedilmiş bir gider yok.
                                    </td>
                                </tr>
                            ) : expenses?.map((expense) => (
                                <tr key={expense.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <td className="p-4 align-middle font-medium">{expense.title}</td>
                                    <td className="p-4 align-middle">
                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle text-muted-foreground">
                                        {expense.projects?.title || '-'}
                                    </td>
                                    <td className="p-4 align-middle text-muted-foreground">
                                        {format(new Date(expense.date), 'd MMM yyyy', { locale: tr })}
                                    </td>
                                    <td className="p-4 align-middle text-right font-medium text-red-600">
                                        -₺{expense.amount.toLocaleString('tr-TR')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ExpenseDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
        </div>
    );
}
