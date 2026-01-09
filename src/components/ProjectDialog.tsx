import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProject, updateProject } from '../services/apiProjects';
import { getClients, createClient } from '../services/apiClients';
import { getPackages } from '../services/apiPackages';
import { getStatuses } from '../services/apiStatuses';
import { Loader2, Search, Plus, Tag, Check, Package as PackageIcon, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Project, Client, Package } from '../types';
import { useState, useEffect } from 'react';

// Combined Schema for final submission check
const fullSchema = z.object({
    // Client
    client_id: z.string().optional(),
    is_new_client: z.boolean(),
    client_name: z.string().optional(), // For new client
    client_phone: z.string().optional(),
    client_tags: z.string().optional(),

    // Project
    title: z.string(),
    status_id: z.string(),
    start_date: z.string().optional(),
    notes: z.string().optional(),

    // Package
    package_id: z.string().optional(),
    custom_price: z.number().optional(),
});

type ProjectFormValues = z.infer<typeof fullSchema>;

interface ProjectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectToEdit?: Project | null;
}

export function ProjectDialog({ isOpen, onClose, projectToEdit }: ProjectDialogProps) {
    const queryClient = useQueryClient();
    const isEditMode = !!projectToEdit;

    // Wizard State
    const [step, setStep] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [isNewClientMode, setIsNewClientMode] = useState(false);

    // State to prevent double-click submission
    const [isReadyToSubmit, setIsReadyToSubmit] = useState(false);

    // Queries
    const { data: statuses } = useQuery({ queryKey: ['statuses'], queryFn: getStatuses });
    const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: getClients });
    const { data: packages } = useQuery({ queryKey: ['packages'], queryFn: getPackages });

    // Helper for filtered clients
    const filteredClients = clients?.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Form
    const { register, handleSubmit, reset, setValue, watch, trigger } = useForm<ProjectFormValues>({
        shouldUnregister: false,
        defaultValues: {
            title: '',
            status_id: '',
            is_new_client: false,
            custom_price: 0
        }
    });

    // Reset wizard when dialog opens/closes
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setStep(1);
                setSearchTerm('');
                setSelectedClient(null);
                setSelectedPackage(null);
                setIsNewClientMode(false);
                reset();
            }, 300);
        }
    }, [isOpen, projectToEdit, reset]);

    // Handle Edit Mode Data Population
    useEffect(() => {
        if (projectToEdit && isOpen) {
            // Populate form...
            setValue('title', projectToEdit.title);
            setValue('status_id', projectToEdit.status_id);
            setValue('start_date', projectToEdit.start_date || '');
            setValue('notes', projectToEdit.notes || '');
            setValue('custom_price', projectToEdit.price || 0);
            if (projectToEdit.client_name) {
                // Try to resolve client...
            }
        }
    }, [projectToEdit, isOpen, setValue]);

    // Manage Submit Ready State for Wizard
    useEffect(() => {
        if (step === 5) {
            const timer = setTimeout(() => setIsReadyToSubmit(true), 500);
            return () => clearTimeout(timer);
        } else {
            setIsReadyToSubmit(false);
        }
    }, [step]);


    // Mutations
    const mutation = useMutation({
        mutationFn: async (data: ProjectFormValues) => {
            let finalClientId = data.client_id;
            // 1. Create Client if New
            if (data.is_new_client && data.client_name) {
                const newClient = await createClient({
                    name: data.client_name,
                    phone: data.client_phone,
                    tags: data.client_tags ? data.client_tags.split(',').map(s => s.trim()) : [],
                    status: 'active'
                });
                finalClientId = newClient.id;
            }

            // 2. Create Project
            const projectPayload = {
                title: data.title,
                status_id: data.status_id,
                client_id: finalClientId,
                client_name: (data.is_new_client ? data.client_name : selectedClient?.name) || "",
                start_date: data.start_date || undefined,
                notes: data.notes || undefined,
                price: data.custom_price || 0,
                // Package details could be appended to notes or tracked separately
                details: selectedPackage ? `Paket: ${selectedPackage.name}` : undefined
            };

            if (isEditMode && projectToEdit) {
                return updateProject(projectToEdit.id, projectPayload);
            } else {
                return createProject(projectPayload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            onClose();
        },
        onError: (e) => console.error(e)
    });

    const onSubmit = (data: ProjectFormValues) => {
        if (step !== 5) return;
        mutation.mutate(data);
    };

    // Navigation Handlers
    const nextStep = async () => {
        if (step === 1) {
            if (isNewClientMode) {
                setStep(2);
            } else if (selectedClient) {
                setValue('client_id', selectedClient.id);
                setStep(3);
            } else {
                // Determine if we should force selection or allow "No Client"
                // Assuming "No Client" is basically skipping selection
                setStep(3);
            }
        } else if (step === 2) {
            const valid = await trigger(['client_name', 'client_phone']);
            if (valid) setStep(3);
        } else if (step === 3) {
            const valid = await trigger(['title', 'status_id']);
            if (valid) setStep(4);
        } else if (step === 4) {
            setStep(5);
        }
    };

    const prevStep = () => {
        if (step === 2) setStep(1);
        else if (step === 3) setStep(isNewClientMode ? 2 : 1);
        else setStep(step - 1);
    };

    // RENDERERS
    const renderStep1_ClientSelect = () => (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Müşteri ara..."
                    className="pl-9 h-11"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="h-[250px] overflow-y-auto border rounded-md p-2 space-y-2">
                <button
                    type="button"
                    onClick={() => { setIsNewClientMode(true); setValue('is_new_client', true); setSelectedClient(null); nextStep(); }}
                    className="w-full flex items-center p-3 rounded-md border border-dashed hover:bg-muted/50 transition-colors text-primary"
                >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <Plus className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                        <div className="font-semibold">Yeni Müşteri Ekle</div>
                        <div className="text-xs text-muted-foreground">Listede yoksa yeni oluşturun</div>
                    </div>
                </button>

                {filteredClients?.map(client => (
                    <button
                        key={client.id}
                        type="button"
                        onClick={() => { setSelectedClient(client); setIsNewClientMode(false); setValue('is_new_client', false); }}
                        className={cn(
                            "w-full flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors",
                            selectedClient?.id === client.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-transparent bg-card"
                        )}
                    >
                        <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mr-3 text-sm font-semibold">
                                {client.name.charAt(0)}
                            </div>
                            <div className="text-left">
                                <div className="font-medium">{client.name}</div>
                                {client.company && <div className="text-xs text-muted-foreground">{client.company}</div>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {client.status === 'active' ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Aktif</span>
                            ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Pasif</span>
                            )}
                            {selectedClient?.id === client.id && <Check className="h-4 w-4 text-primary" />}
                        </div>
                    </button>
                ))}

                {filteredClients?.length === 0 && !isNewClientMode && (
                    <div className="text-center p-4 text-muted-foreground text-sm">
                        Sonuç bulunamadı.
                    </div>
                )}
            </div>
        </div>
    );

    const renderStep2_NewClient = () => (
        <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="grid gap-2">
                <Label>Müşteri Adı</Label>
                <Input {...register('client_name')} placeholder="Örn. Ahmet Yılmaz" />
            </div>
            <div className="grid gap-2">
                <Label>Telefon</Label>
                <Input {...register('client_phone')} placeholder="0555..." />
            </div>
            <div className="grid gap-2">
                <Label>Etiketler (Virgülle ayırın)</Label>
                <div className="relative">
                    <Tag className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input {...register('client_tags')} className="pl-9" placeholder="VIP, Düğün, Kurumsal..." />
                </div>
            </div>
        </div>
    );

    const renderStep3_ProjectInfo = () => (
        <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="grid gap-2">
                <Label>Proje Başlığı</Label>
                <Input {...register('title')} placeholder="Örn. 2024 Yaz Kataloğu" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Durum</Label>
                    <select {...register('status_id')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        {statuses?.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                </div>
                <div className="grid gap-2">
                    <Label>Tarih</Label>
                    <Input type="date" {...register('start_date')} />
                </div>
            </div>
            <div className="grid gap-2">
                <Label>Notlar</Label>
                <Input {...register('notes')} placeholder="Detaylar..." />
            </div>
        </div>
    );

    const renderStep4_Packages = () => (
        <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto">
                <button
                    type="button"
                    onClick={() => { setSelectedPackage(null); setValue('custom_price', 0); }}
                    className={cn(
                        "flex items-start p-4 rounded-xl border text-left transition-all",
                        selectedPackage === null ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                    )}
                >
                    <div className="flex-1">
                        <div className="font-semibold flex items-center">
                            <PackageIcon className="h-4 w-4 mr-2" /> Özel / Paketsiz
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                            Kendi fiyatınızı belirleyin.
                        </div>
                        {selectedPackage === null && (
                            <div className="mt-2 text-sm font-medium text-primary">
                                <Label>Fiyat (₺)</Label>
                                <Input
                                    type="number"
                                    className="mt-1 w-32 bg-white"
                                    {...register('custom_price', { valueAsNumber: true })}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                    </div>
                </button>

                {packages?.map(pkg => (
                    <button
                        key={pkg.id}
                        type="button"
                        onClick={() => { setSelectedPackage(pkg); setValue('custom_price', pkg.price); setValue('package_id', pkg.id); }}
                        className={cn(
                            "flex items-start p-4 rounded-xl border text-left transition-all",
                            selectedPackage?.id === pkg.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                        )}
                    >
                        <div className="flex-1">
                            <div className="flex justify-between items-center">
                                <div className="font-semibold">{pkg.name}</div>
                                <div className="font-bold text-primary">₺{pkg.price.toLocaleString('tr-TR')}</div>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">{pkg.description}</div>
                            {pkg.features && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {pkg.features.map((f, i) => (
                                        <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{f}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderStep5_Summary = () => {
        const formData = watch();
        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="rounded-lg border p-4 space-y-4 bg-muted/10">
                    <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Müşteri</span>
                        <span className="font-medium">
                            {isNewClientMode ? formData.client_name : selectedClient?.name}
                            {isNewClientMode && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">YENİ</span>}
                        </span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Proje</span>
                        <span className="font-medium">{formData.title}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Tarih</span>
                        <span className="font-medium">{formData.start_date || 'Belirtilmedi'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <span className="text-muted-foreground">Paket / Tutar</span>
                        <div className="text-right">
                            <div className="font-bold text-lg text-primary">₺{formData.custom_price?.toLocaleString('tr-TR')}</div>
                            {selectedPackage && <div className="text-xs text-muted-foreground">{selectedPackage.name}</div>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (isEditMode) {
        return (
            <Dialog
                isOpen={isOpen}
                onClose={onClose}
                title="Projeyi Düzenle"
                description="Mevcut proje bilgilerini güncelleyin."
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div className="grid gap-2">
                        <Label>Proje Başlığı</Label>
                        <Input {...register('title')} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Müşteri</Label>
                        <div className="text-sm font-medium p-2 border rounded bg-muted/10">
                            {projectToEdit.client_name || 'Kayıtlı Müşteri Yok'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Durum</Label>
                            <select {...register('status_id')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                {statuses?.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Tarih</Label>
                            <Input type="date" {...register('start_date')} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Fiyat (₺)</Label>
                        <Input type="number" {...register('custom_price', { valueAsNumber: true })} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Notlar</Label>
                        <Input {...register('notes')} />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Güncelle
                        </Button>
                    </div>
                </form>
            </Dialog>
        );
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={`Yeni Proje - Adım ${step}/5`}
            description={
                step === 1 ? "Müşteri seçin veya yeni oluşturun." :
                    step === 2 ? "Yeni müşteri detaylarını girin." :
                        step === 3 ? "Proje detaylarını girin." :
                            step === 4 ? "Bir paket seçin veya fiyat belirleyin." :
                                "Bilgileri kontrol edip onaylayın."
            }
        >
            <div className="mt-4">
                {/* Steps Indicator */}
                <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map(s => (
                        <div key={s} className={cn("h-1 flex-1 rounded-full transition-all", s <= step ? "bg-primary" : "bg-muted")} />
                    ))}
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                    {step === 1 && renderStep1_ClientSelect()}
                    {step === 2 && renderStep2_NewClient()}
                    {step === 3 && renderStep3_ProjectInfo()}
                    {step === 4 && renderStep4_Packages()}
                    {step === 5 && renderStep5_Summary()}

                    <div className="flex justify-between mt-6 pt-4 border-t">
                        {step > 1 ? (
                            <Button type="button" variant="outline" onClick={prevStep}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                            </Button>
                        ) : (
                            <Button type="button" variant="ghost" onClick={onClose}>İptal</Button>
                        )}

                        {step < 5 ? (
                            <Button type="button" onClick={nextStep} disabled={step === 1 && !selectedClient && !isNewClientMode}>
                                İleri <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={mutation.isPending || !isReadyToSubmit}
                                className="bg-green-600 hover:bg-green-700 transition-all"
                            >
                                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Onayla ve Oluştur
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </Dialog>
    );
}
