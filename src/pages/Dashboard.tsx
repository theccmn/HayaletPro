import { useQuery } from '@tanstack/react-query';
import { getTransactions } from '../services/apiFinance';
import { getProjects } from '../services/apiProjects';
import {
    LayoutGrid,
    TrendingUp,
    Wallet,
    CreditCard,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { TransactionDialog } from '../components/TransactionDialog';
import { StatCard } from '../components/dashboard/StatCard';
import { DashboardCalendar } from '../components/dashboard/DashboardCalendar';
import { DashboardIncomeChart } from '../components/dashboard/DashboardIncomeChart';
import type { TimeFilter } from '../utils/dateFilters';
import {
    calculateNetProfit,
    calculateTotalIncome,
    countProjects,
    getOverduePayments,
    getUpcomingProjects,
    getUpcomingPaymentTotal,
} from '../utils/dateFilters';

export default function Dashboard() {
    const navigate = useNavigate();
    const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);

    // Time filter states
    const [netKasaFilter, setNetKasaFilter] = useState<TimeFilter>('day');
    const [gelirFilter, setGelirFilter] = useState<TimeFilter>('day');
    const [odemeFilter, setOdemeFilter] = useState<TimeFilter>('month');
    const [projeFilter, setProjeFilter] = useState<TimeFilter>('month');

    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => getTransactions(),
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    // Calculations
    const netKasa = calculateNetProfit(transactions, netKasaFilter);
    const gelir = calculateTotalIncome(transactions, gelirFilter);
    const projeCount = countProjects(projects, projeFilter);

    // Payments
    const overduePayments = getOverduePayments(projects, transactions);
    const hasOverduePayments = overduePayments.length > 0;
    const paymentTotal = getUpcomingPaymentTotal(projects, transactions, odemeFilter);

    // Upcoming projects (within 7 days)
    const upcomingProjects = getUpcomingProjects(projects, 7);
    const hasUpcomingProjects = upcomingProjects.length > 0;

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gösterge Paneli</h1>
                    <p className="text-muted-foreground">Stüdyonuzun genel durumuna göz atın.</p>
                </div>

                <Button
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all h-12 px-6 text-base"
                    onClick={() => setIsTransactionDialogOpen(true)}
                >
                    <Wallet className="mr-2 h-5 w-5" />
                    Kasa İşlemi Ekle
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Net Kasa */}
                <StatCard
                    title="Net Kasa"
                    value={netKasa}
                    icon={Wallet}
                    colorTheme="primary"
                    timeFilter={netKasaFilter}
                    onTimeFilterChange={setNetKasaFilter}
                    showTimeFilter={true}
                />

                {/* Gelir */}
                <StatCard
                    title="Gelir"
                    value={gelir}
                    icon={TrendingUp}
                    colorTheme="green"
                    timeFilter={gelirFilter}
                    onTimeFilterChange={setGelirFilter}
                    showTimeFilter={true}
                />

                {/* Ödemeler */}
                <StatCard
                    title="Ödemeler"
                    value={paymentTotal}
                    icon={CreditCard}
                    colorTheme={hasOverduePayments ? 'red' : 'amber'}
                    timeFilter={odemeFilter}
                    onTimeFilterChange={setOdemeFilter}
                    showTimeFilter={true}
                    hasWarning={hasOverduePayments}
                    warningText={hasOverduePayments ? 'Aksiyon gerekli' : undefined}
                    suffix={hasOverduePayments ? 'gecikmiş' : 'yaklaşan'}
                    isClickable={true}
                    onClick={() => navigate('/overdue-payments')}
                />

                {/* Proje */}
                <StatCard
                    title="Proje"
                    value={projeCount}
                    icon={LayoutGrid}
                    colorTheme="blue"
                    timeFilter={projeFilter}
                    onTimeFilterChange={setProjeFilter}
                    showTimeFilter={true}
                    suffix="kayıtlı"
                    hasWarning={hasUpcomingProjects}
                    warningText={hasUpcomingProjects ? `${upcomingProjects.length} yaklaşan proje` : undefined}
                    onClick={() => navigate(`/projects?timeFilter=${projeFilter}`)}
                    isClickable={true}
                />
            </div>

            {/* Bottom Section: Calendar + Income Chart */}
            <div className="grid gap-6 md:grid-cols-2">
                <DashboardCalendar />
                <DashboardIncomeChart transactions={transactions} />
            </div>

            {/* Transaction Dialog */}
            <TransactionDialog
                isOpen={isTransactionDialogOpen}
                onClose={() => setIsTransactionDialogOpen(false)}
            />
        </div>
    );
}
