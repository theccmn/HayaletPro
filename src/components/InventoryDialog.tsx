import { useForm } from 'react-hook-form';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createInventoryItem, updateInventoryItem, getCategories } from '../services/apiInventory';
import type { InventoryItem, NewInventoryItem } from '../types';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface InventoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    itemToEdit?: InventoryItem | null;
}

export function InventoryDialog({ isOpen, onClose, itemToEdit }: InventoryDialogProps) {
    const queryClient = useQueryClient();
    const isEditMode = !!itemToEdit;

    // Fetch categories
    const { data: categories = [] } = useQuery({
        queryKey: ['inventory-categories'],
        queryFn: getCategories,
    });

    const { register, handleSubmit, reset, setValue, watch } = useForm<NewInventoryItem>({
        defaultValues: {
            name: '',
            category: '',
            brand: '',
            model: '',
            serial_number: '',
            purchase_date: '',
            price: 0,
            status: 'available', // Default to available
            notes: ''
        }
    });

    // Set default category when categories load
    useEffect(() => {
        if (categories.length > 0 && !watch('category')) {
            setValue('category', categories[0].name);
        }
    }, [categories, setValue, watch]);

    useEffect(() => {
        if (isOpen) {
            if (itemToEdit) {
                setValue('name', itemToEdit.name);
                setValue('category', itemToEdit.category);
                setValue('brand', itemToEdit.brand || '');
                setValue('model', itemToEdit.model || '');
                setValue('serial_number', itemToEdit.serial_number || '');
                setValue('purchase_date', itemToEdit.purchase_date || '');
                setValue('price', itemToEdit.price);
                // Status is hidden but we keep it in data
                setValue('status', itemToEdit.status);
                setValue('notes', itemToEdit.notes || '');
            } else {
                reset({
                    name: '',
                    category: categories.length > 0 ? categories[0].name : '',
                    brand: '',
                    model: '',
                    serial_number: '',
                    purchase_date: new Date().toISOString().split('T')[0],
                    price: 0,
                    status: 'available',
                    notes: ''
                });
            }
        }
    }, [isOpen, itemToEdit, setValue, reset, categories]);

    const mutation = useMutation({
        mutationFn: (data: NewInventoryItem) => {
            if (isEditMode && itemToEdit) {
                return updateInventoryItem(itemToEdit.id, data);
            }
            return createInventoryItem(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            onClose();
        },
    });

    const onSubmit = (data: NewInventoryItem) => {
        mutation.mutate(data);
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? "Ekipmanı Düzenle" : "Yeni Ekipman Ekle"}
            description="Envanterinize yeni bir demirbaş ekleyin veya düzenleyin."
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="grid gap-2">
                    <Label>Ekipman Adı</Label>
                    <Input {...register('name', { required: true })} placeholder="Örn. Sony A7S III" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Kategori</Label>
                        <select
                            {...register('category', { required: true })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Marka</Label>
                        <Input {...register('brand')} placeholder="Sony, Canon..." />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Model</Label>
                        <Input {...register('model')} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Seri No</Label>
                        <Input {...register('serial_number')} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Alış Tarihi</Label>
                        <Input type="date" {...register('purchase_date')} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Fiyat (₺)</Label>
                        <Input type="number" {...register('price')} />
                    </div>
                </div>

                {/* Status field removed as requested */}

                <div className="grid gap-2">
                    <Label>Notlar</Label>
                    <Input {...register('notes')} />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? 'Güncelle' : 'Kaydet'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
