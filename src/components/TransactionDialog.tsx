import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTransaction } from '../services/apiFinance';
import type { NewTransaction } from '../types';
import { getProjects } from '../services/apiProjects';
import { getStatuses } from '../services/apiStatuses';
import { Dialog as CustomDialog } from './ui/dialog';
import { cn } from '../lib/utils';
import { ArrowDownCircle, ArrowUpCircle, Search, Settings } from 'lucide-react';
import { getFinanceSettings } from '../services/apiFinance';
import { FinanceSettingsDialog } from './FinanceSettingsDialog';
import { insertEvent, checkConnection } from '../services/apiGoogleCalendar';
import { toast } from 'sonner';

interface TransactionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    defaultProjectId?: string;
}

// Hardcoded lists removed in favor of dynamic settings

export function TransactionDialog({ isOpen, onClose, defaultProjectId }: TransactionDialogProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
    const [projectId, setProjectId] = useState<string>('none');

    // Job/Delivery Date States
    const [hasJobDate, setHasJobDate] = useState(false);
    const [jobDate, setJobDate] = useState(new Date().toISOString().split('T')[0]);

    // Project filtering states
    const [projectSearch, setProjectSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Google Calendar State
    const [addToCalendar, setAddToCalendar] = useState(false);
    const [isCalendarConnected, setIsCalendarConnected] = useState(false);

    useEffect(() => {
        checkConnection().then(setIsCalendarConnected);
    }, [isOpen]);

    const queryClient = useQueryClient();
    // ... (skipping unchanged lines is not possible with replace_file_content unless I target specific chunks. I will use multi_replace for this.)

    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    const { data: statuses } = useQuery({
        queryKey: ['statuses'],
        queryFn: getStatuses,
    });

    const { data: incomeCategories } = useQuery({ queryKey: ['settings', 'income_category'], queryFn: () => getFinanceSettings('income_category') });
    const { data: expenseCategories } = useQuery({ queryKey: ['settings', 'expense_category'], queryFn: () => getFinanceSettings('expense_category') });
    const { data: paymentMethods } = useQuery({ queryKey: ['settings', 'payment_method'], queryFn: () => getFinanceSettings('payment_method') });

    const currentCategories = type === 'income' ? incomeCategories : expenseCategories;

    // Set default category and payment method when data loads or type changes
    useEffect(() => {
        if (currentCategories && currentCategories.length > 0 && !category) {
            setCategory(currentCategories[0].label);
        } else if (currentCategories && currentCategories.length > 0 && !currentCategories.find(c => c.label === category)) {
            setCategory(currentCategories[0].label);
        }
    }, [currentCategories, category, type]);

    useEffect(() => {
        if (paymentMethods && paymentMethods.length > 0 && !paymentMethod) {
            setPaymentMethod(paymentMethods[0].label);
        }
    }, [paymentMethods, paymentMethod]);

    // Set default project ID when dialog opens
    useEffect(() => {
        if (isOpen && defaultProjectId) {
            setProjectId(defaultProjectId);
        } else if (!isOpen) { // Reset when closed
            setProjectId('none');
        }
    }, [isOpen, defaultProjectId]);

    const createMutation = useMutation({
        mutationFn: async (data: NewTransaction) => {
            const result = await createTransaction(data);

            // Handle Google Calendar sync
            if (addToCalendar && isCalendarConnected && data.job_date && data.type === 'income') {
                try {
                    // Convert to YYYY-MM-DD for All Day Event
                    const yyyyMMdd = data.job_date.split('T')[0];

                    // Calculate next day for end date (exclusive)
                    const startDateObj = new Date(yyyyMMdd);
                    const endDateObj = new Date(startDateObj);
                    endDateObj.setDate(endDateObj.getDate() + 1);
                    const nextDayStr = endDateObj.toISOString().split('T')[0];

                    const result = await insertEvent({
                        summary: `[Teslimat] ${data.title}`,
                        description: `Tutar: ${data.amount}₺\nKategori: ${data.category}`,
                        start: {
                            date: yyyyMMdd
                        },
                        end: {
                            date: nextDayStr
                        }
                    });
                    console.log('Transaction Event Inserted:', result);
                    toast.success("Google Takvim'e eklendi.");
                } catch (error) {
                    console.error("Calendar Sync Error:", error);
                    toast.error("Google Takvim senkronizasyonu başarısız oldu.");
                }
            }
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            onClose();
            // Reset form
            setTitle('');
            setAmount('');
            setType('income');
            setDate(new Date().toISOString().split('T')[0]);
            setPaymentMethod(paymentMethods?.[0]?.label || '');
            setProjectId('none');
            setProjectSearch('');
            setStatusFilter('all');
            setHasJobDate(false);
            setAddToCalendar(false);
            setJobDate(new Date().toISOString().split('T')[0]);
            // setJobTime removed - handled with default
        },
    });

    // Filter projects
    const filteredProjects = projects?.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(projectSearch.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status_id === statusFilter;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => a.title.localeCompare(b.title));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Calculate job_date if specified (always set time to 09:00 for consistency)
        let finalJobDate: string | undefined = undefined;
        if (type === 'income' && hasJobDate) {
            finalJobDate = `${jobDate}T09:00:00`;
        }

        // Use category as title if title is empty
        const finalTitle = title.trim() || category;

        const transaction: NewTransaction = {
            title: finalTitle,
            amount: parseFloat(amount),
            type,
            category,
            payment_method: paymentMethod as any,
            date: `${date}T${time}:00`,
            project_id: projectId === 'none' ? null : projectId,
            job_date: finalJobDate,
        };
        createMutation.mutate(transaction);
    };

    // Reset category when type changes if current category is not in list
    const handleTypeChange = (newType: 'income' | 'expense') => {
        setType(newType);
        // Category update handled by useEffect
    };

    return (
        <CustomDialog
            isOpen={isOpen}
            onClose={onClose}
            title={type === 'income' ? "Yeni Gelir Ekle" : "Yeni Gider Ekle"}
            description="Finansal hareket kaydı oluşturun."
        >
            <form onSubmit={handleSubmit} className="space-y-4 mt-4 max-h-[calc(85vh-120px)] overflow-y-auto px-1">
                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <button
                        type="button"
                        onClick={() => handleTypeChange('income')}
                        className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                            type === 'income'
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-muted hover:bg-muted/50 text-muted-foreground"
                        )}
                    >
                        <ArrowDownCircle className="w-6 h-6 mb-2" />
                        <span className="font-semibold">Gelir</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTypeChange('expense')}
                        className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                            type === 'expense'
                                ? "border-red-500 bg-red-50 text-red-700"
                                : "border-muted hover:bg-muted/50 text-muted-foreground"
                        )}
                    >
                        <ArrowUpCircle className="w-6 h-6 mb-2" />
                        <span className="font-semibold">Gider</span>
                    </button>
                </div>

                {/* Common Fields */}
                <div className="grid gap-2">
                    <Label htmlFor="title">Açıklama (Opsiyonel)</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={type === 'income' ? "Örn: Proje Ön Ödemesi" : "Örn: Kamera Kiralama"}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="amount">Tutar (₺)</Label>
                    <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                    />
                </div>

                {/* Project Selection with Filter */}
                <div className="grid gap-2 p-3 border rounded-lg bg-muted/20">
                    <Label className="mb-1 text-xs uppercase text-muted-foreground font-semibold">Proje Seçimi (Opsiyonel)</Label>

                    {/* Filters */}
                    <div className="flex gap-2 mb-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Proje ara..."
                                value={projectSearch}
                                onChange={(e) => setProjectSearch(e.target.value)}
                                className="pl-8 h-9 text-sm"
                            />
                        </div>
                        <div className="relative w-1/3">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                            >
                                <option value="all">Tüm Durumlar</option>
                                {statuses?.map(s => (
                                    <option key={s.id} value={s.id}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="relative">
                        <select
                            id="project"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none font-medium"
                        >
                            <option value="none">-- Projesiz --</option>
                            {filteredProjects?.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.title}
                                </option>
                            ))}
                        </select>
                        <div className="text-[10px] text-muted-foreground mt-1 text-right">
                            {filteredProjects?.length} proje listelendi
                        </div>
                    </div>
                </div>

                {/* Job / Delivery Date Toggle (Only for Income) */}
                {type === 'income' && (
                    <div className="bg-muted/30 p-3 rounded-lg border space-y-3">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="hasJobDate"
                                checked={hasJobDate}
                                onChange={(e) => setHasJobDate(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="hasJobDate" className="cursor-pointer font-medium">Bu iş için Takvim Kaydı oluştur</Label>
                        </div>

                        {hasJobDate && (
                            <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="jobDate" className="text-xs">İş/Teslim Tarihi</Label>
                                    <Input
                                        id="jobDate"
                                        type="date"
                                        value={jobDate}
                                        onChange={(e) => setJobDate(e.target.value)}
                                        className="h-8"
                                    />
                                </div>
                            </div>
                        )}

                        {hasJobDate && isCalendarConnected && (
                            <div className="flex items-center space-x-2 pl-6 animate-in fade-in slide-in-from-top-1">
                                <input
                                    type="checkbox"
                                    id="addToCalendar"
                                    checked={addToCalendar}
                                    onChange={(e) => setAddToCalendar(e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="addToCalendar" className="cursor-pointer text-xs text-blue-700 font-medium flex items-center gap-1">
                                    Google Takvim'e de ekle
                                </Label>
                            </div>
                        )}

                        <p className="text-[10px] text-muted-foreground ml-6">
                            İşaretlerseniz, işlem tarihinden bağımsız olarak bu tarih "iş günü" olarak takvimde görünür.
                        </p>
                    </div>
                )}

                <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="category">Kategori</Label>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => setIsSettingsOpen(true)}
                        >
                            <Settings className="w-3 h-3 mr-1" />
                            Düzenle
                        </Button>
                    </div>
                    <div className="relative">
                        <select
                            id="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                        >
                            {currentCategories?.map((cat) => (
                                <option key={cat.id} value={cat.label}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="paymentMethod">Gelir Şekli</Label>
                    <div className="relative">
                        <select
                            id="paymentMethod"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                        >
                            {paymentMethods?.map((method) => (
                                <option key={method.id} value={method.label}>
                                    {method.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 grid gap-2">
                        <Label htmlFor="date">Tarih</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="time">Saat</Label>
                        <Input
                            id="time"
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                        İptal
                    </Button>
                    <Button
                        type="submit"
                        disabled={createMutation.isPending}
                        className={type === 'income' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                    >
                        {createMutation.isPending ? 'Kaydediliyor...' : type === 'income' ? 'Gelir Ekle' : 'Gider Ekle'}
                    </Button>
                </div>
            </form>
            <FinanceSettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </CustomDialog >
    );
}
