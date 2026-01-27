import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../services/apiProjects';
import { getTransactions } from '../services/apiFinance';
import { getUpcomingPayments } from '../utils/dateFilters';
import type { PaymentInfo } from '../utils/dateFilters';
import { ArrowLeft, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '../lib/utils';
import type { TimeFilter } from '../utils/dateFilters';

export default function OverduePayments() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const filterParam = searchParams.get('filter') as TimeFilter;
    const activeFilter: TimeFilter = ['day', 'week', 'month', 'year', 'all'].includes(filterParam) ? filterParam : 'all';

    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    const { data: transactions } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => getTransactions(),
    });

    const allPayments = projects && transactions
        ? getUpcomingPayments(projects, transactions, activeFilter)
        : [];

    const overduePayments = allPayments.filter((p) => p.isOverdue);
    const upcomingPayments = allPayments.filter((p) => !p.isOverdue);

    const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);
    const totalUpcoming = upcomingPayments.reduce((sum, p) => sum + p.amount, 0);

    const renderPaymentCard = (payment: PaymentInfo) => {
        const dueDate = parseISO(payment.dueDate);
        const daysFromNow = differenceInDays(dueDate, new Date());

        return (
            <div
                key={payment.installmentId}
                className={cn(
                    'flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer',
                    payment.isOverdue
                        ? 'bg-red-50 border-red-200 hover:bg-red-100'
                        : 'bg-card border-border hover:bg-muted/50'
                )}
                onClick={() => navigate(`/projects/${payment.projectId}`)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{payment.projectTitle}</h3>
                        {payment.isOverdue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                <AlertTriangle className="h-3 w-3" />
                                Gecikmiş
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{payment.clientName}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                            {format(dueDate, 'dd MMMM yyyy', { locale: tr })}
                            {!payment.isOverdue && daysFromNow <= 7 && (
                                <span className="ml-1 text-amber-600">({daysFromNow} gün kaldı)</span>
                            )}
                            {payment.isOverdue && (
                                <span className="ml-1 text-red-600">({Math.abs(daysFromNow)} gün gecikti)</span>
                            )}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={cn(
                        'text-right',
                        payment.isOverdue ? 'text-red-700' : 'text-foreground'
                    )}>
                        <div className="text-lg font-bold">₺{payment.amount.toLocaleString('tr-TR')}</div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ödemeler</h1>
                    <p className="text-muted-foreground">Gecikmiş ve yaklaşan ödemeleri görüntüleyin.</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className={cn(
                    'rounded-2xl border p-6',
                    overduePayments.length > 0 ? 'bg-red-50 border-red-200' : 'bg-card'
                )}>
                    <div className="flex items-center justify-between">
                        <h3 className={cn(
                            'font-semibold',
                            overduePayments.length > 0 ? 'text-red-600' : 'text-muted-foreground'
                        )}>
                            Gecikmiş Ödemeler
                        </h3>
                        {overduePayments.length > 0 && (
                            <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                        )}
                    </div>
                    <div className={cn(
                        'mt-2 text-2xl font-bold',
                        overduePayments.length > 0 ? 'text-red-700' : 'text-foreground'
                    )}>
                        ₺{totalOverdue.toLocaleString('tr-TR')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {overduePayments.length} adet ödeme
                    </div>
                </div>

                <div className="rounded-2xl border bg-card p-6">
                    <h3 className="font-semibold text-muted-foreground">Yaklaşan Ödemeler</h3>
                    <div className="mt-2 text-2xl font-bold text-amber-600">
                        ₺{totalUpcoming.toLocaleString('tr-TR')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {upcomingPayments.length} adet ödeme
                    </div>
                </div>
            </div>

            {/* Overdue Payments List */}
            {overduePayments.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Gecikmiş Ödemeler ({overduePayments.length})
                    </h2>
                    <div className="space-y-2">
                        {overduePayments.map(renderPaymentCard)}
                    </div>
                </div>
            )}

            {/* Upcoming Payments List */}
            {upcomingPayments.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        Yaklaşan Ödemeler ({upcomingPayments.length})
                    </h2>
                    <div className="space-y-2">
                        {upcomingPayments.map(renderPaymentCard)}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {allPayments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <Clock className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-lg">Bekleyen Ödeme Yok</h3>
                    <p className="text-muted-foreground mt-1">
                        Tüm ödemeler tamamlanmış görünüyor.
                    </p>
                </div>
            )}
        </div>
    );
}
