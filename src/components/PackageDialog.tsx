import { useForm, useFieldArray } from 'react-hook-form';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPackage, updatePackage } from '../services/apiPackages';
import type { Package } from '../types';
import { useEffect } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableFeatureItem } from './SortableFeatureItem';

interface PackageDialogProps {
    isOpen: boolean;
    onClose: () => void;
    itemToEdit?: Package | null;
}

export function PackageDialog({ isOpen, onClose, itemToEdit }: PackageDialogProps) {
    const queryClient = useQueryClient();
    const isEditMode = !!itemToEdit;

    const { register, control, handleSubmit, reset, setValue } = useForm<{
        name: string;
        description: string;
        price: number;
        features: { value: string }[];
    }>({
        defaultValues: {
            name: '',
            description: '',
            price: 0,
            features: []
        }
    });

    const { fields, append, remove, move } = useFieldArray({
        control,
        name: "features"
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (isOpen) {
            if (itemToEdit) {
                setValue('name', itemToEdit.name);
                setValue('description', itemToEdit.description || '');
                setValue('price', itemToEdit.price);
                setValue('features', itemToEdit.features ? itemToEdit.features.map(f => ({ value: f })) : []);
            } else {
                reset({
                    name: '',
                    description: '',
                    price: 0,
                    features: []
                });
            }
        }
    }, [isOpen, itemToEdit, setValue, reset]);

    const mutation = useMutation({
        mutationFn: (data: any) => {
            const payload: Omit<Package, 'id' | 'created_at'> = {
                name: data.name,
                description: data.description,
                price: data.price,
                features: data.features.map((f: any) => f.value).filter((v: string) => v.trim() !== '')
            };

            if (isEditMode && itemToEdit) {
                return updatePackage(itemToEdit.id, payload);
            }
            return createPackage(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            onClose();
        },
    });

    const onSubmit = (data: any) => {
        mutation.mutate(data);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex(f => f.id === active.id);
            const newIndex = fields.findIndex(f => f.id === over.id);
            move(oldIndex, newIndex);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? "Paketi Düzenle" : "Yeni Paket Ekle"}
            description="Müşterilerinize sunacağınız hizmet paketlerini yönetin."
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="grid gap-2">
                    <Label>Paket Adı</Label>
                    <Input {...register('name', { required: true })} placeholder="Örn. Düğün Hikayesi" />
                </div>

                <div className="grid gap-2">
                    <Label>Fiyat (₺)</Label>
                    <Input type="number" {...register('price', { valueAsNumber: true })} />
                </div>

                <div className="grid gap-2">
                    <Label>Açıklama</Label>
                    <Input {...register('description')} placeholder="Kısa açıklama..." />
                </div>

                <div className="grid gap-2">
                    <Label>Özellikler (Sıralamak için sürükleyin)</Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded p-2 bg-slate-50/50">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={fields.map(f => f.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-2">
                                    {fields.map((field, index) => (
                                        <SortableFeatureItem
                                            key={field.id}
                                            id={field.id}
                                            index={index}
                                            register={register}
                                            onRemove={remove}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full text-xs dashed border-primary/50 text-primary hover:bg-primary/5 mt-2"
                            onClick={() => append({ value: '' })}
                        >
                            <Plus className="h-3 w-3 mr-1" /> Özellik Ekle
                        </Button>
                    </div>
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
