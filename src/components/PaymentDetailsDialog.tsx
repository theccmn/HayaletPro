import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactions } from '../services/apiFinance';
import { getProjectInstallments, updateInstallment, createInstallments, deleteInstallment } from '../services/apiInstallments';
import { Pencil, X, Check, Loader2, Plus, Trash2, Calendar, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';
import type { Project, NewInstallment } from '../types';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface PaymentDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
}

export function PaymentDetailsDialog({ isOpen, onClose, project }: PaymentDetailsDialogProps) {
    const queryClient = useQueryClient();
    const [newAmount, setNewAmount] = useState<number>(0);
    const [newDate, setNewDate] = useState<string>('');
    const [newNote, setNewNote] = useState<string>('');

    // Edit Mode State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState<number>(0);
    const [editDate, setEditDate] = useState<string>('');
    const [editNote, setEditNote] = useState<string>('');

    // Fetch Installments (fresh data)
    const { data: installments, isLoading: isLoadingInstallments } = useQuery({
        queryKey: ['project_installments', project?.id],
        queryFn: () => getProjectInstallments(project!.id),
        enabled: !!project,
    });

    // Fetch Transactions (fresh data)
    const { data: transactions } = useQuery({
        queryKey: ['transactions', project?.id], // Include project ID in key
        queryFn: () => getTransactions(project?.id), // Pass project ID
        enabled: !!project,
    });

    const createMutation = useMutation({
        mutationFn: async (newInst: NewInstallment) => {
            await createInstallments([newInst]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_installments'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] }); // To update badge
            setNewAmount(0);
            setNewDate('');
            setNewNote('');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteInstallment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_installments'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
            await updateInstallment(id, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_installments'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setEditingId(null);
        }
    });



    // Calculate Financials
    const projectIncome = transactions
        ?.filter(t => t.type === 'income' && t.project_id === project?.id)
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    const totalPlanned = installments?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
    const remainingToPlan = (project?.price || 0) - totalPlanned;

    // Calculate Statuses with Smart Matching (Exact Match First)
    const installmentsWithStatus = useMemo(() => {
        if (!installments || !transactions || !project) return [];

        const incomeTransactions = transactions.filter(t => t.type === 'income' && t.project_id === project.id);
        // Create a copy to track used transactions by ID to prevent double counting if we needed strict 1-to-1 matching, 
        // but here amounts are fungible essentially. 
        // Actually, strictly removing used "funds" is safer.
        let availableFunds = incomeTransactions.map(t => t.amount);

        const result = installments.map(inst => ({ ...inst, status: 'unpaid' as any, paidAmount: 0 }));

        // Pass 1: Exact Matches
        // We look for installments that match a specific transaction amount exactly
        result.forEach(inst => {
            const matchIndex = availableFunds.findIndex(amount => amount === inst.amount);
            if (matchIndex !== -1) {
                inst.status = 'paid';
                inst.paidAmount = inst.amount;
                availableFunds.splice(matchIndex, 1); // Consume this specific fund logic
            }
        });

        // Pass 2: FIFO for remaining funds
        // Sum up remaining funds
        let runningPaid = availableFunds.reduce((a, b) => a + b, 0);

        // Apply to remaining unpaid/partial installments
        result.forEach(inst => {
            if (inst.status === 'paid') return; // Already matched

            if (runningPaid >= inst.amount) {
                inst.status = 'paid';
                inst.paidAmount = inst.amount;
                runningPaid -= inst.amount;
            } else if (runningPaid > 0) {
                inst.status = 'partial';
                inst.paidAmount = runningPaid;
                runningPaid = 0;
            }

            // Check overdue
            if (inst.status !== 'paid' && new Date(inst.due_date) < new Date(new Date().setHours(0, 0, 0, 0))) {
                inst.status = inst.status === 'partial' ? 'partial' : 'overdue'; // Partial is conceptually overdue too but let's keep partial status distinctive or mix them? 
                // Let's keep 'overdue' only if strictly unpaid? Or 'partial' is better info than 'overdue'?
                // If it's partial, it is also overdue usually. But 'Partial' explicitly says "we got money". 
                // Let's stick to logic: if Partial, keep Partial (shows progress). If Unpaid and late -> Overdue.
                if (inst.status === 'unpaid') inst.status = 'overdue';
            }
        });

        return result;
        return result;
    }, [installments, transactions, project?.id]);

    // Handlers
    const handleAdd = () => {
        if (!newAmount || !newDate || !project) return;
        createMutation.mutate({
            project_id: project.id,
            amount: newAmount,
            due_date: newDate,
            notes: newNote || 'Ek Taksit'
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('Bu taksiti silmek istediğinize emin misiniz?')) {
            deleteMutation.mutate(id);
        }
    };

    const startEditing = (inst: any) => {
        setEditingId(inst.id);
        setEditAmount(inst.amount);
        setEditDate(inst.due_date);
        setEditNote(inst.notes || '');
    };

    const cancelEditing = () => {
        setEditingId(null);
    };

    const saveEditing = (id: string) => {
        if (!editAmount || !editDate) return;
        updateMutation.mutate({
            id,
            updates: {
                amount: editAmount,
                due_date: editDate,
                notes: editNote
            }
        });
    };

    const formatMoney = (amount: number) => `₺${amount.toLocaleString('tr-TR')}`;

    if (!project) return null;

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Ödeme Planı Detayları"
            description={`${project.title} - ${project.client_name}`}
            className="max-w-2xl"
        >
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/20 border">
                        <div className="text-xs text-muted-foreground uppercase font-bold">Toplam Tutar</div>
                        <div className="text-xl font-bold text-primary">{formatMoney(project.price || 0)}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                        <div className="text-xs text-green-700 uppercase font-bold">Ödenen</div>
                        <div className="text-xl font-bold text-green-700">{formatMoney(projectIncome)}</div>
                    </div>
                    <div className={cn("p-4 rounded-lg border", (project.price || 0) - projectIncome <= 0 ? "bg-green-100 border-green-200" : "bg-red-50 border-red-100")}>
                        <div className={cn("text-xs uppercase font-bold", (project.price || 0) - projectIncome <= 0 ? "text-green-700" : "text-red-700")}>Kalan</div>
                        <div className={cn("text-xl font-bold", (project.price || 0) - projectIncome <= 0 ? "text-green-700" : "text-red-700")}>{formatMoney(Math.max(0, (project.price || 0) - projectIncome))}</div>
                    </div>
                </div>

                {/* Planned vs Unplanned Warning & Success */}
                {remainingToPlan !== 0 ? (
                    <div className={cn("text-xs px-3 py-2 rounded border flex items-center gap-2", remainingToPlan > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200")}>
                        <AlertCircle className="w-4 h-4" />
                        {remainingToPlan > 0
                            ? `Toplam tutarın ${formatMoney(remainingToPlan)} kadarı henüz planlanmadı.`
                            : `Planlanan tutar toplam tutarı ${formatMoney(Math.abs(remainingToPlan))} aşıyor.`}
                    </div>
                ) : (project.price || 0) > 0 && (project.price || 0) - projectIncome <= 0 && (
                    <div className="text-xs px-3 py-2 rounded border flex items-center gap-2 bg-green-100 text-green-700 border-green-200 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        Tebrikler! Proje ödemesi tamamlandı.
                    </div>
                )}

                {/* Installments List */}
                <div className="space-y-3">
                    <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Taksitler</Label>

                    {isLoadingInstallments ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                    ) : installmentsWithStatus?.length === 0 ? (
                        <div className="text-center p-4 text-muted-foreground text-sm border border-dashed rounded-lg">Ödeme planı oluşturulmamış.</div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {installmentsWithStatus?.map(inst => (
                                <div key={inst.id} className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border text-sm transition-all",
                                    inst.status === 'paid' ? "bg-green-50/50 border-green-100" :
                                        inst.status === 'overdue' ? "bg-red-50/50 border-red-100" : "bg-card"
                                )}>
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                            inst.status === 'paid' ? "bg-green-100 text-green-700" :
                                                inst.status === 'overdue' ? "bg-red-100 text-red-700" :
                                                    inst.status === 'partial' ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                                        )}>
                                            {inst.status === 'paid' ? <CheckCircle2 className="w-4 h-4" /> :
                                                inst.status === 'overdue' ? <AlertCircle className="w-4 h-4" /> :
                                                    <div className="font-bold text-xs">{format(new Date(inst.due_date), 'dd')}</div>}
                                        </div>

                                        {editingId === inst.id ? (
                                            <div className="flex items-center gap-2 w-full">
                                                <Input
                                                    type="number"
                                                    value={editAmount}
                                                    onChange={(e) => setEditAmount(parseFloat(e.target.value))}
                                                    className="h-8 w-24"
                                                />
                                                <Input
                                                    type="date"
                                                    value={editDate}
                                                    onChange={(e) => setEditDate(e.target.value)}
                                                    className="h-8 w-32"
                                                />
                                                <Input
                                                    value={editNote}
                                                    onChange={(e) => setEditNote(e.target.value)}
                                                    className="h-8 flex-1"
                                                    placeholder="Not"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="font-semibold flex items-center gap-2">
                                                    {formatMoney(inst.amount)}
                                                    {inst.status === 'partial' && (
                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-full font-normal">
                                                            Kalan: {formatMoney(inst.amount - inst.paidAmount)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {inst.notes} • {format(new Date(inst.due_date), 'd MMMM yyyy', { locale: tr })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {editingId === inst.id ? (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => saveEditing(inst.id)}>
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={cancelEditing}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <div className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                                    inst.status === 'paid' ? "bg-green-100 text-green-700" :
                                                        inst.status === 'overdue' ? "bg-red-100 text-red-700" :
                                                            inst.status === 'partial' ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                                                )}>
                                                    {inst.status === 'paid' ? 'Tahsil Edildi' :
                                                        inst.status === 'overdue' ? 'Gecikti' :
                                                            inst.status === 'partial' ? 'Kısmi' : 'Bekliyor'}
                                                </div>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEditing(inst)}>
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(inst.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Installment */}
                <div className="pt-4 border-t">
                    <Label className="mb-2 block text-xs font-bold text-muted-foreground uppercase">Taksit Ekle</Label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="Tutar"
                            value={newAmount || ''}
                            onChange={e => setNewAmount(parseFloat(e.target.value))}
                            className="flex-1"
                        />
                        <Input
                            type="date"
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                            className="w-32"
                        />
                        <Input
                            placeholder="Not"
                            value={newNote}
                            onChange={e => setNewNote(e.target.value)}
                            className="flex-1"
                        />
                        <Button onClick={handleAdd} disabled={!newAmount || !newDate || createMutation.isPending}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Received Payments List */}
                <div className="space-y-3 pt-4 border-t">
                    <Label className="flex items-center gap-2 text-green-700"><CheckCircle2 className="w-4 h-4" /> Alınan Ödemeler (Gerçekleşen)</Label>

                    {!transactions || transactions.length === 0 ? (
                        <div className="text-center p-4 text-muted-foreground text-sm border border-dashed rounded-lg bg-muted/10">Henüz tahsilat yapılmamış.</div>
                    ) : (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {transactions.filter(t => t.type === 'income').map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-green-100 bg-green-50/30 text-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                                            <Wallet className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-semibold">{formatMoney(t.amount)}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {t.title} • {format(new Date(t.date), 'd MMMM yyyy', { locale: tr })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-bold uppercase">
                                        Tahsil Edildi
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Dialog >
    );
}
