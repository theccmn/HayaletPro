import { useForm } from 'react-hook-form';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInventoryItem, updateInventoryItem } from '../services/apiInventory';
import type { InventoryItem, NewInventoryItem } from '../types';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface InventoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    itemToEdit?: InventoryItem | null;
}

const CATEGORIES = ['Kamera', 'Lens', 'Işık', 'Ses', 'Aksesuar', 'Bilgisayar', 'Diğer'];
const STATUSES = [
    { value: 'available', label: 'Ofiste (Müsait)' },
    { value: 'rented', label: 'Kirada / Projede' },
    { value: 'maintenance', label: 'Bakımda' },
    { value: 'lost', label: 'Kayıp / Çalıntı' },
];

export function InventoryDialog({ isOpen, onClose, itemToEdit }: InventoryDialogProps) {
    const queryClient = useQueryClient();
    const isEditMode = !!itemToEdit;

    const { register, handleSubmit, reset, setValue } = useForm<NewInventoryItem>({
        defaultValues: {
            name: '',
            category: 'Kamera',
            brand: '',
            model: '',
            serial_number: '',
            purchase_date: '',
            price: 0,
            status: 'available',
            notes: ''
        }
    });

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
                setValue('status', itemToEdit.status);
                setValue('notes', itemToEdit.notes || '');
            } else {
                reset({
                    name: '',
                    category: 'Kamera',
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
    }, [isOpen, itemToEdit, setValue, reset]);

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
                            {...register('category')}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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

                <div className="grid gap-2">
                    <Label>Durum</Label>
                    <select
                        {...register('status')}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>

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
