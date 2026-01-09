import { useQuery } from '@tanstack/react-query';
import { getTransactions } from '../services/apiFinance';
import { getProjects } from '../services/apiProjects';
import { LayoutGrid, TrendingUp, Wallet, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { TransactionDialog } from '../components/TransactionDialog';

export default function Dashboard() {
    const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);

    const { data: transactions } = useQuery({
        queryKey: ['transactions'],
        queryFn: getTransactions,
    });

    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    const totalIncome = transactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    const totalExpense = transactions
        ?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    const netProfit = totalIncome - totalExpense;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Stüdyonuzun genel durumuna göz atın.</p>
                </div>

                {/* Big Safe Button */}
                <Button
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all h-12 px-6 text-base"
                    onClick={() => setIsTransactionDialogOpen(true)}
                >
                    <Wallet className="mr-2 h-5 w-5" />
                    Kasa İşlemi Ekle
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Net Profit Card */}
                <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md group">
                    <div className="flex items-center justify-between space-y-0">
                        <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">Net Kasa</h3>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <Wallet className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tighter">₺{netProfit.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/50"></div>
                </div>

                {/* Income Card */}
                <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md group">
                    <div className="flex items-center justify-between space-y-0">
                        <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">Toplam Gelir</h3>
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tighter text-green-600">₺{totalIncome.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                </div>

                {/* Active Projects Card */}
                <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md group">
                    <div className="flex items-center justify-between space-y-0">
                        <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">Toplam Proje</h3>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <LayoutGrid className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tighter">{projects?.length || 0}</span>
                        <span className="text-xs font-medium text-muted-foreground">kayıtlı</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                </div>
            </div>

            {/* Quick Links / Actions */}
            <div className="grid gap-6 md:grid-cols-2">
                <Link to="/projects" className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-lg">Projeler</h3>
                            <p className="text-sm text-muted-foreground">Projelerinizi yönetin ve durumlarını güncelleyin.</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                </Link>
                <Link to="/finance" className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-lg">Finansal Raporlar</h3>
                            <p className="text-sm text-muted-foreground">Detaylı gelir/gider raporlarını inceleyin.</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                </Link>
            </div>

            <TransactionDialog isOpen={isTransactionDialogOpen} onClose={() => setIsTransactionDialogOpen(false)} />
        </div>
    );
}
