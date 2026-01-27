import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactions, deleteTransaction, getFinanceSettings } from '../services/apiFinance';
import { Loader2, Plus, TrendingDown, TrendingUp, Wallet, Settings, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Download, X, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { format, parseISO, isWithinInterval, startOfMonth, startOfYear, endOfMonth, endOfYear, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { TransactionDialog } from '../components/TransactionDialog';
import { FinanceCharts } from '../components/FinanceCharts';
import { FinanceSettingsDialog } from '../components/FinanceSettingsDialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';

type SortColumn = 'title' | 'category' | 'type' | 'project' | 'date' | 'amount' | 'payment_method';
type SortDirection = 'asc' | 'desc';
type PeriodMode = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => 2020 + i);

export default function Finance() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    // Filtreler
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

    // Akıllı tarih seçici
    const [periodMode, setPeriodMode] = useState<PeriodMode>('daily');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
    const [dateRangeStart, setDateRangeStart] = useState<string>('');
    const [dateRangeEnd, setDateRangeEnd] = useState<string>('');

    // Sıralama
    const [sortColumn, setSortColumn] = useState<SortColumn>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const { data: transactions, isLoading } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => getTransactions(),
    });

    const { data: paymentMethods } = useQuery({
        queryKey: ['settings', 'payment_method'],
        queryFn: () => getFinanceSettings('payment_method'),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setDeleteTargetId(null);
        },
    });

    // Benzersiz proje ve kategorileri çıkar
    const uniqueProjects = useMemo(() => {
        const projects = transactions
            ?.map(t => t.projects?.title)
            .filter((title): title is string => !!title);
        return [...new Set(projects)].sort();
    }, [transactions]);

    const uniqueCategories = useMemo(() => {
        const categories = transactions
            ?.map(t => t.category)
            .filter((cat): cat is string => !!cat);
        return [...new Set(categories)].sort();
    }, [transactions]);

    // Tarih aralığı hesaplama
    const getDateRange = useMemo(() => {
        const now = new Date();
        let start: Date;
        let end: Date;

        switch (periodMode) {
            case 'daily':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                break;
            case 'weekly':
                // Pazartesi'den bugüne
                const dayOfWeek = getDay(now);
                const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Pazar=0, Pazartesi=1
                start = new Date(now);
                start.setDate(now.getDate() - daysFromMonday);
                start.setHours(0, 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                break;
            case 'monthly':
                start = startOfMonth(new Date(selectedYear, selectedMonth));
                // Eğer bu ayki yılın mevcut ayı ve şu anki yılsa, bugüne kadar; değilse ay sonu
                if (selectedYear === CURRENT_YEAR && selectedMonth === now.getMonth()) {
                    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                } else if (selectedYear === CURRENT_YEAR && selectedMonth > now.getMonth()) {
                    // Gelecek ay seçildi, boş dön
                    start = new Date(0);
                    end = new Date(0);
                } else {
                    end = endOfMonth(new Date(selectedYear, selectedMonth));
                }
                break;
            case 'yearly':
                start = startOfYear(new Date(selectedYear, 0));
                // Mevcut yılsa bugüne kadar, geçmiş yılsa yıl sonu
                if (selectedYear === CURRENT_YEAR) {
                    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                } else {
                    end = endOfYear(new Date(selectedYear, 0));
                }
                break;
            case 'custom':
                if (dateRangeStart && dateRangeEnd) {
                    start = new Date(dateRangeStart);
                    start.setHours(0, 0, 0, 0);
                    end = new Date(dateRangeEnd);
                    end.setHours(23, 59, 59, 999);
                } else {
                    // Tarih seçilmediyse tüm zamanlar
                    start = new Date(2000, 0, 1);
                    end = new Date(2100, 11, 31);
                }
                break;
            default:
                start = new Date(2000, 0, 1);
                end = new Date(2100, 11, 31);
        }

        return { start, end };
    }, [periodMode, selectedMonth, selectedYear, dateRangeStart, dateRangeEnd]);

    // Filtreleme mantığı
    const filteredTransactions = useMemo(() => {
        const { start, end } = getDateRange;

        return transactions?.filter(t => {
            const date = parseISO(t.date);

            // 1. Tarih Filtresi
            if (!isWithinInterval(date, { start, end })) return false;

            // 2. Tür Filtresi
            if (typeFilter !== 'all' && t.type !== typeFilter) return false;

            // 3. Metin Arama
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesTitle = t.title?.toLowerCase().includes(query);
                const matchesCategory = t.category?.toLowerCase().includes(query);
                const matchesProject = t.projects?.title?.toLowerCase().includes(query);
                if (!matchesTitle && !matchesCategory && !matchesProject) return false;
            }

            // 4. Proje Filtresi
            if (projectFilter !== 'all') {
                if (t.projects?.title !== projectFilter) return false;
            }

            // 5. Kategori Filtresi
            if (categoryFilter !== 'all') {
                if (t.category !== categoryFilter) return false;
            }

            // 6. Gelir Şekli (Ödeme Yöntemi) Filtresi
            if (paymentMethodFilter !== 'all') {
                if (t.payment_method !== paymentMethodFilter) return false;
            }

            return true;
        });
    }, [transactions, getDateRange, typeFilter, searchQuery, projectFilter, categoryFilter, paymentMethodFilter]);

    // Sıralama mantığı
    const sortedTransactions = useMemo(() => {
        if (!filteredTransactions) return [];

        return [...filteredTransactions].sort((a, b) => {
            let comparison = 0;

            switch (sortColumn) {
                case 'title':
                    comparison = (a.title || '').localeCompare(b.title || '');
                    break;
                case 'category':
                    comparison = (a.category || '').localeCompare(b.category || '');
                    break;
                case 'type':
                    comparison = (a.type || '').localeCompare(b.type || '');
                    break;
                case 'project':
                    comparison = (a.projects?.title || '').localeCompare(b.projects?.title || '');
                    break;
                case 'date':
                    comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                    break;
                case 'amount':
                    comparison = (a.amount || 0) - (b.amount || 0);
                    break;
                case 'payment_method':
                    comparison = (a.payment_method || '').localeCompare(b.payment_method || '');
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [filteredTransactions, sortColumn, sortDirection]);

    // Sıralama toggle
    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection(column === 'date' ? 'desc' : 'asc');
        }
    };

    // Sıralama ikonu
    const SortIcon = ({ column }: { column: SortColumn }) => {
        if (sortColumn !== column) {
            return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
        }
        return sortDirection === 'asc'
            ? <ArrowUp className="ml-1 h-3 w-3 text-primary" />
            : <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
    };

    // Filtreleri temizle
    const clearFilters = () => {
        setSearchQuery('');
        setProjectFilter('all');
        setCategoryFilter('all');
        setPaymentMethodFilter('all');
        setTypeFilter('all');
        setPeriodMode('daily');
        setSelectedMonth(new Date().getMonth());
        setSelectedYear(CURRENT_YEAR);
        setDateRangeStart('');
        setDateRangeEnd('');
    };

    const hasActiveFilters = searchQuery || projectFilter !== 'all' || categoryFilter !== 'all' || typeFilter !== 'all' || paymentMethodFilter !== 'all';

    // CSV Export - Türkçe Excel için noktalı virgül
    const exportToCSV = () => {
        if (!sortedTransactions.length) return;

        const headers = ['İşlem', 'Kategori', 'Tür', 'Gelir Şekli', 'Proje', 'Tarih', 'Tutar'];
        const rows = sortedTransactions.map(t => [
            t.title || '',
            t.category || '',
            t.type === 'income' ? 'Gelir' : 'Gider',
            t.payment_method || '-',
            t.projects?.title || '-',
            format(new Date(t.date), 'd MMM yyyy HH:mm', { locale: tr }),
            t.type === 'income' ? t.amount : -t.amount
        ]);

        // Noktalı virgül ayracı ile CSV (Türkçe Excel için)
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(';'))
            .join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `islem-dokumu-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };

    // Tarih aralığı gösterimi
    const getDateRangeLabel = () => {
        const { start, end } = getDateRange;
        switch (periodMode) {
            case 'daily':
                return format(new Date(), 'd MMMM yyyy', { locale: tr });
            case 'weekly':
                return `${format(start, 'd MMM', { locale: tr })} - ${format(end, 'd MMM yyyy', { locale: tr })}`;
            case 'monthly':
                return `${MONTHS[selectedMonth]} ${selectedYear}`;
            case 'yearly':
                return `${selectedYear}`;
            case 'custom':
                if (dateRangeStart && dateRangeEnd) {
                    return `${format(start, 'd MMM', { locale: tr })} - ${format(end, 'd MMM yyyy', { locale: tr })}`;
                }
                return 'Tarih seçin';
            default:
                return '';
        }
    };

    const totalIncome = filteredTransactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    const totalExpense = filteredTransactions
        ?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

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
                    <h1 className="text-3xl font-bold tracking-tight">Finans Yönetimi</h1>
                    <p className="text-muted-foreground">Gelir, gider ve nakit akışınızı takip edin.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" /> Ayarlar
                    </Button>
                    <Button onClick={() => setIsDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" /> Yeni İşlem Ekle
                    </Button>
                </div>
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

            {/* Filters & Dashboard */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold leading-none tracking-tight">Finansal Rapor</h3>
                    <span className="text-sm text-muted-foreground">{getDateRangeLabel()}</span>
                </div>
                {/* Pass Filtered Transactions to Charts */}
                <FinanceCharts transactions={filteredTransactions || []} period={periodMode === 'custom' ? 'all' : periodMode === 'daily' ? 'day' : periodMode === 'weekly' ? 'week' : periodMode === 'monthly' ? 'month' : 'year'} />
            </div>

            {/* Transactions List */}
            <div className="rounded-md border bg-card">
                {/* Header with title and export */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-3">
                        <h3 className="font-semibold">İşlem Dökümü</h3>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {sortedTransactions.length} sonuç
                        </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!sortedTransactions.length}>
                        <Download className="mr-2 h-4 w-4" /> CSV İndir
                    </Button>
                </div>

                {/* Advanced Filters Panel */}
                <div className="p-4 border-b bg-muted/20 space-y-3">
                    {/* Row 1: Search, Project, Category */}
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="İşlem, kategori veya proje ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[150px]"
                        >
                            <option value="all">Tüm Projeler</option>
                            {uniqueProjects.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[150px]"
                        >
                            <option value="all">Tüm Kategoriler</option>
                            {uniqueCategories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <select
                            value={paymentMethodFilter}
                            onChange={(e) => setPaymentMethodFilter(e.target.value)}
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[150px]"
                        >
                            <option value="all">Tüm Gelir Şekilleri</option>
                            {paymentMethods?.map(pm => (
                                <option key={pm.id} value={pm.label}>{pm.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Row 2: Date Selector + Type Filter */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Date Selector */}
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />

                            {/* Period Mode Buttons */}
                            <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
                                <button
                                    onClick={() => setPeriodMode('daily')}
                                    className={cn("px-3 py-1 text-xs rounded-sm transition-all", periodMode === 'daily' ? "bg-background shadow-sm font-medium" : "hover:bg-background/50")}
                                >
                                    Günlük
                                </button>
                                <button
                                    onClick={() => setPeriodMode('weekly')}
                                    className={cn("px-3 py-1 text-xs rounded-sm transition-all", periodMode === 'weekly' ? "bg-background shadow-sm font-medium" : "hover:bg-background/50")}
                                >
                                    Haftalık
                                </button>
                                <button
                                    onClick={() => setPeriodMode('monthly')}
                                    className={cn("px-3 py-1 text-xs rounded-sm transition-all", periodMode === 'monthly' ? "bg-background shadow-sm font-medium" : "hover:bg-background/50")}
                                >
                                    Aylık
                                </button>
                                <button
                                    onClick={() => setPeriodMode('yearly')}
                                    className={cn("px-3 py-1 text-xs rounded-sm transition-all", periodMode === 'yearly' ? "bg-background shadow-sm font-medium" : "hover:bg-background/50")}
                                >
                                    Yıllık
                                </button>
                                <button
                                    onClick={() => setPeriodMode('custom')}
                                    className={cn("px-3 py-1 text-xs rounded-sm transition-all", periodMode === 'custom' ? "bg-background shadow-sm font-medium" : "hover:bg-background/50")}
                                >
                                    Özel
                                </button>
                            </div>

                            {/* Month Selector (only for monthly mode) */}
                            {periodMode === 'monthly' && (
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
                                >
                                    {MONTHS.map((month, idx) => (
                                        <option key={idx} value={idx} disabled={selectedYear === CURRENT_YEAR && idx > new Date().getMonth()}>
                                            {month}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Year Selector (for monthly and yearly modes) */}
                            {(periodMode === 'monthly' || periodMode === 'yearly') && (
                                <select
                                    value={selectedYear}
                                    onChange={(e) => {
                                        const year = parseInt(e.target.value);
                                        setSelectedYear(year);
                                        // Eğer mevcut yılı seçtiyse ve seçili ay gelecek aysa, şu anki aya dön
                                        if (year === CURRENT_YEAR && selectedMonth > new Date().getMonth()) {
                                            setSelectedMonth(new Date().getMonth());
                                        }
                                    }}
                                    className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
                                >
                                    {YEARS.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            )}

                            {/* Custom Date Range (only for custom mode) */}
                            {periodMode === 'custom' && (
                                <div className="flex items-center gap-2 bg-background rounded-md border px-2 py-1">
                                    <Input
                                        type="date"
                                        value={dateRangeStart}
                                        onChange={(e) => setDateRangeStart(e.target.value)}
                                        className="border-0 p-0 h-6 w-28 focus-visible:ring-0 text-sm"
                                    />
                                    <span className="text-muted-foreground text-sm">-</span>
                                    <Input
                                        type="date"
                                        value={dateRangeEnd}
                                        onChange={(e) => setDateRangeEnd(e.target.value)}
                                        className="border-0 p-0 h-6 w-28 focus-visible:ring-0 text-sm"
                                    />
                                </div>
                            )}

                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-8">
                                    <X className="mr-1 h-3 w-3" /> Temizle
                                </Button>
                            )}
                        </div>

                        {/* Type Filter */}
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

                {/* Table */}
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors bg-muted/30">
                                <th
                                    className="h-12 px-4 align-middle font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => handleSort('title')}
                                >
                                    <div className="flex items-center">
                                        İşlem <SortIcon column="title" />
                                    </div>
                                </th>
                                <th
                                    className="h-12 px-4 align-middle font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => handleSort('category')}
                                >
                                    <div className="flex items-center">
                                        Kategori <SortIcon column="category" />
                                    </div>
                                </th>
                                <th
                                    className="h-12 px-4 align-middle font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => handleSort('type')}
                                >
                                    <div className="flex items-center">
                                        Tür <SortIcon column="type" />
                                    </div>
                                </th>
                                <th
                                    className="h-12 px-4 align-middle font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => handleSort('payment_method')}
                                >
                                    <div className="flex items-center">
                                        Gelir Şekli <SortIcon column="payment_method" />
                                    </div>
                                </th>
                                <th
                                    className="h-12 px-4 align-middle font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => handleSort('project')}
                                >
                                    <div className="flex items-center">
                                        Proje <SortIcon column="project" />
                                    </div>
                                </th>
                                <th
                                    className="h-12 px-4 align-middle font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => handleSort('date')}
                                >
                                    <div className="flex items-center">
                                        Tarih <SortIcon column="date" />
                                    </div>
                                </th>
                                <th
                                    className="h-12 px-4 align-middle font-medium text-muted-foreground text-right cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center justify-end">
                                        Tutar <SortIcon column="amount" />
                                    </div>
                                </th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-center w-20">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {sortedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="h-8 w-8 opacity-50" />
                                            <p>Aramanızla eşleşen kayıt bulunamadı.</p>
                                            {hasActiveFilters && (
                                                <Button variant="link" size="sm" onClick={clearFilters}>
                                                    Filtreleri temizle
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : sortedTransactions.map((transaction) => (
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
                                        {transaction.payment_method || '-'}
                                    </td>
                                    <td className="p-4 align-middle text-muted-foreground">
                                        {transaction.projects?.title || '-'}
                                    </td>
                                    <td className="p-4 align-middle text-muted-foreground">
                                        {format(parseISO(transaction.date), 'd MMM yyyy HH:mm', { locale: tr })}
                                    </td>
                                    <td className={cn(
                                        "p-4 align-middle text-right font-medium",
                                        transaction.type === 'income' ? "text-green-600" : "text-red-600"
                                    )}>
                                        {transaction.type === 'income' ? '+' : '-'}₺{transaction.amount.toLocaleString('tr-TR')}
                                    </td>
                                    <td className="p-4 align-middle text-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                            onClick={() => setDeleteTargetId(transaction.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <TransactionDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
            <FinanceSettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>İşlemi Sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlemi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
                        >
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
