import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient, updateClient } from '../services/apiClients';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Client } from '../types';
import { useEffect } from 'react';

const clientSchema = z.object({
    name: z.string().min(1, 'Müşteri adı gereklidir'),
    company: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Geçerli bir e-posta adresi giriniz').optional().or(z.literal('')),
    address: z.string().optional(),
    notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientDialogProps {
    isOpen: boolean;
    onClose: () => void;
    clientToEdit?: Client | null;
}

export function ClientDialog({ isOpen, onClose, clientToEdit }: ClientDialogProps) {
    const queryClient = useQueryClient();
    const isEditMode = !!clientToEdit;

    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<ClientFormValues>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            name: '',
            company: '',
            phone: '',
            email: '',
            address: '',
            notes: ''
        }
    });

    useEffect(() => {
        if (clientToEdit) {
            setValue('name', clientToEdit.name);
            setValue('company', clientToEdit.company || '');
            setValue('phone', clientToEdit.phone || '');
            setValue('email', clientToEdit.email || '');
            setValue('address', clientToEdit.address || '');
            setValue('notes', clientToEdit.notes || '');
        } else {
            reset({
                name: '',
                company: '',
                phone: '',
                email: '',
                address: '',
                notes: ''
            });
        }
    }, [clientToEdit, setValue, reset, isOpen]);

    const mutationFn = isEditMode
        ? (data: any) => updateClient(clientToEdit.id, data)
        : createClient;

    const mutation = useMutation({
        mutationFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            reset();
            onClose();
        },
        onError: (error) => {
            console.error('İşlem hatası:', error);
        }
    });

    const onSubmit = (data: ClientFormValues) => {
        const formattedData = {
            ...data,
            company: data.company || undefined,
            phone: data.phone || undefined,
            email: data.email || undefined,
            address: data.address || undefined,
            notes: data.notes || undefined,
        };

        mutation.mutate(formattedData);
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? "Müşteriyi Düzenle" : "Yeni Müşteri Ekle"}
            description={isEditMode ? "Müşteri bilgilerini güncelleyin." : "Yeni bir müşteri kaydı oluşturun."}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">Ad Soyad</Label>
                    <Input id="name" {...register('name')} placeholder="Örn. Ayşe Demir" />
                    {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="company">Şirket / Firma (İsteğe bağlı)</Label>
                    <Input id="company" {...register('company')} placeholder="Örn. ABC Prodüksiyon" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Telefon</Label>
                        <Input id="phone" {...register('phone')} placeholder="0555 123 45 67" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">E-posta</Label>
                        <Input id="email" type="email" {...register('email')} placeholder="ornek@email.com" />
                        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="address">Adres</Label>
                    <textarea
                        id="address"
                        {...register('address')}
                        className={cn(
                            "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                        placeholder="Müşteri adresi..."
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="notes">Notlar</Label>
                    <textarea
                        id="notes"
                        {...register('notes')}
                        className={cn(
                            "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                        placeholder="Müşteri hakkında özel notlar..."
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                        İptal
                    </Button>
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? "Güncelle" : "Kaydet"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
