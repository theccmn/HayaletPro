import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createExpense } from '../services/apiExpenses';
import type { NewExpense } from '../services/apiExpenses';
import { getProjects } from '../services/apiProjects';
import { Dialog as CustomDialog } from './ui/dialog';

interface ExpenseDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES = [
    'Ekipman',
    'Ulaşım',
    'Yemek',
    'Maaş',
    'Ofis',
    'Yazılım',
    'Diğer'
];

export function ExpenseDialog({ isOpen, onClose }: ExpenseDialogProps) {
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [projectId, setProjectId] = useState<string>('none');

    const queryClient = useQueryClient();

    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    const createMutation = useMutation({
        mutationFn: createExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            onClose();
            // Reset form
            setTitle('');
            setAmount('');
            setCategory(CATEGORIES[0]);
            setDate(new Date().toISOString().split('T')[0]);
            setProjectId('none');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const expense: NewExpense = {
            title,
            amount: parseFloat(amount),
            category,
            date,
            project_id: projectId === 'none' ? null : projectId,
        };
        createMutation.mutate(expense);
    };

    return (
        <CustomDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Yeni Gider Ekle"
            description="Yeni bir harcama kaydı oluşturun."
        >
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid gap-2">
                    <Label htmlFor="title">Gider Başlığı</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Örn: Kamera Bataryası"
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
                <div className="grid gap-2">
                    <Label htmlFor="category">Kategori</Label>
                    <div className="relative">
                        <select
                            id="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                        {/* Optional chevron icon can be added here for styling */}
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="project">Proje (Opsiyonel)</Label>
                    <div className="relative">
                        <select
                            id="project"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                        >
                            <option value="none">-- Projesiz --</option>
                            {projects?.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.title}
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
                    <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                </div>
            </form>
        </CustomDialog>
    );
}
