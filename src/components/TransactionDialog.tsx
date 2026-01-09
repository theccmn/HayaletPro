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
import { ArrowDownCircle, ArrowUpCircle, Search } from 'lucide-react';

interface TransactionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    defaultProjectId?: string;
}

const EXPENSE_CATEGORIES = [
    'Ekipman',
    'Ulaşım',
    'Yemek',
    'Maaş',
    'Ofis',
    'Yazılım',
    'Diğer'
];

const INCOME_CATEGORIES = [
    'Proje Ödemesi',
    'Danışmanlık',
    'Ek Hizmet',
    'Diğer'
];

export function TransactionDialog({ isOpen, onClose, defaultProjectId }: TransactionDialogProps) {
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [projectId, setProjectId] = useState<string>('none');

    // Job/Delivery Date States
    const [hasJobDate, setHasJobDate] = useState(false);
    const [jobDate, setJobDate] = useState(new Date().toISOString().split('T')[0]);
    const [jobTime, setJobTime] = useState('09:00');

    // Project filtering states
    const [projectSearch, setProjectSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const queryClient = useQueryClient();

    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    const { data: statuses } = useQuery({
        queryKey: ['statuses'],
        queryFn: getStatuses,
    });

    // Set default project ID when dialog opens
    useEffect(() => {
        if (isOpen && defaultProjectId) {
            setProjectId(defaultProjectId);
        } else if (!isOpen) { // Reset when closed
            setProjectId('none');
        }
    }, [isOpen, defaultProjectId]);

    const createMutation = useMutation({
        mutationFn: createTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            onClose();
            // Reset form
            setTitle('');
            setAmount('');
            setType('income');
            setDate(new Date().toISOString().split('T')[0]);
            setProjectId('none');
            setProjectSearch('');
            setStatusFilter('all');
            setHasJobDate(false);
            setJobDate(new Date().toISOString().split('T')[0]);
            setJobTime('09:00');
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

        // Calculate job_date if specified
        let finalJobDate: string | undefined = undefined;
        if (type === 'income' && hasJobDate) {
            finalJobDate = `${jobDate}T${jobTime}:00`;
        }

        const transaction: NewTransaction = {
            title,
            amount: parseFloat(amount),
            type,
            category,
            date,
            project_id: projectId === 'none' ? null : projectId,
            job_date: finalJobDate,
        };
        createMutation.mutate(transaction);
    };

    const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

    // Reset category when type changes if current category is not in list
    const handleTypeChange = (newType: 'income' | 'expense') => {
        setType(newType);
        if (newType === 'expense') {
            setCategory(EXPENSE_CATEGORIES[0]);
        } else {
            setCategory(INCOME_CATEGORIES[0]);
        }
    };

    return (
        <CustomDialog
            isOpen={isOpen}
            onClose={onClose}
            title={type === 'income' ? "Yeni Gelir Ekle" : "Yeni Gider Ekle"}
            description="Finansal hareket kaydı oluşturun."
        >
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
                    <Label htmlFor="title">Açıklama</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={type === 'income' ? "Örn: Proje Ön Ödemesi" : "Örn: Kamera Kiralama"}
                        required
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
                                <div className="grid gap-1.5">
                                    <Label htmlFor="jobTime" className="text-xs">Saat</Label>
                                    <Input
                                        id="jobTime"
                                        type="time"
                                        value={jobTime}
                                        onChange={(e) => setJobTime(e.target.value)}
                                        className="h-8"
                                    />
                                </div>
                            </div>
                        )}
                        <p className="text-[10px] text-muted-foreground ml-6">
                            İşaretlerseniz, işlem tarihinden bağımsız olarak bu tarih "iş günü" olarak takvimde görünür.
                        </p>
                    </div>
                )}

                <div className="grid gap-2">
                    <Label htmlFor="category">Kategori</Label>
                    <div className="relative">
                        <select
                            id="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                        >
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="date">Tarih</Label>
                    <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                    />
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
        </CustomDialog>
    );
}
