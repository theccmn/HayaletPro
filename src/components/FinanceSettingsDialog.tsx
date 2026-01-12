import { useState } from 'react';
import { Dialog as CustomDialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFinanceSettings, createFinanceSetting, updateFinanceSetting, deleteFinanceSetting } from '../services/apiFinance';
import { ArrowUp, ArrowDown, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import type { FinanceSetting, NewFinanceSetting } from '../types';
import { cn } from '../lib/utils';

interface FinanceSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FinanceSettingsDialog({ isOpen, onClose }: FinanceSettingsDialogProps) {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [newValue, setNewValue] = useState('');

    // Fetch existing settings
    const { data: incomeCategories } = useQuery({ queryKey: ['settings', 'income_category'], queryFn: () => getFinanceSettings('income_category') });
    const { data: expenseCategories } = useQuery({ queryKey: ['settings', 'expense_category'], queryFn: () => getFinanceSettings('expense_category') });
    const { data: paymentMethods } = useQuery({ queryKey: ['settings', 'payment_method'], queryFn: () => getFinanceSettings('payment_method') });

    // Mutations
    const createMutation = useMutation({
        mutationFn: createFinanceSetting,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            setNewValue('');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string, updates: Partial<FinanceSetting> }) => updateFinanceSetting(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            setEditingId(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteFinanceSetting,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] })
    });

    const handleAdd = (type: FinanceSetting['type']) => {
        if (!newValue.trim()) return;
        createMutation.mutate({ type, label: newValue.trim(), order_index: 0, is_visible: true });
    };

    const handleEditStart = (item: FinanceSetting) => {
        setEditingId(item.id);
        setEditValue(item.label);
    };

    const handleEditSave = (id: string) => {
        if (!editValue.trim()) return;
        updateMutation.mutate({ id, updates: { label: editValue.trim() } });
    };

    const handleDelete = (id: string) => {
        if (confirm('Bu öğeyi silmek istediğinize emin misiniz?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleMove = (item: FinanceSetting, direction: 'up' | 'down', list: FinanceSetting[]) => {
        const index = list.findIndex(i => i.id === item.id);
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === list.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const targetItem = list[targetIndex];

        // Swap order_index
        updateMutation.mutate({ id: item.id, updates: { order_index: targetItem.order_index } });
        updateMutation.mutate({ id: targetItem.id, updates: { order_index: item.order_index } });
    };

    const renderList = (items: FinanceSetting[] | undefined, type: FinanceSetting['type']) => (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    placeholder="Yeni Ekle..."
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd(type)}
                />
                <Button onClick={() => handleAdd(type)} size="icon"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {items?.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded-md bg-card hover:bg-muted/50 transition-colors">
                        {editingId === item.id ? (
                            <div className="flex flex-1 gap-2 mr-2">
                                <Input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="h-8"
                                    autoFocus
                                />
                                <Button size="sm" variant="ghost" onClick={() => handleEditSave(item.id)}><Save className="h-4 w-4 text-green-600" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4 text-red-600" /></Button>
                            </div>
                        ) : (
                            <span className="flex-1 text-sm font-medium pl-2">{item.label}</span>
                        )}

                        <div className="flex items-center gap-1">
                            {!editingId && (
                                <>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditStart(item)}><Edit2 className="h-3 w-3" /></Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
                                    <div className="w-px h-4 bg-border mx-1" />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => handleMove(item, 'up', items)}
                                        disabled={index === 0}
                                    >
                                        <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => handleMove(item, 'down', items)}
                                        disabled={index === items.length - 1}
                                    >
                                        <ArrowDown className="h-3 w-3" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <CustomDialog isOpen={isOpen} onClose={onClose} title="Finans Ayarları" description="Kategorileri ve ödeme yöntemlerini yönetin.">
            <Tabs defaultValue="income" className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="income">Gelir Kat.</TabsTrigger>
                    <TabsTrigger value="expense">Gider Kat.</TabsTrigger>
                    <TabsTrigger value="payment">Ödeme Yönt.</TabsTrigger>
                </TabsList>
                <TabsContent value="income" className="mt-4">
                    {renderList(incomeCategories, 'income_category')}
                </TabsContent>
                <TabsContent value="expense" className="mt-4">
                    {renderList(expenseCategories, 'expense_category')}
                </TabsContent>
                <TabsContent value="payment" className="mt-4">
                    {renderList(paymentMethods, 'payment_method')}
                </TabsContent>
            </Tabs>
        </CustomDialog>
    );
}
