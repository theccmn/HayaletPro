import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProject, updateProject, getProjects } from '../services/apiProjects';
import { getClients, createClient } from '../services/apiClients';
import { getPackages } from '../services/apiPackages';
import { getStatuses } from '../services/apiStatuses';
import { createInstallments } from '../services/apiInstallments';
import { getSetting } from '../services/apiSettings';
import { getContractSettings } from '../services/apiContract';
import { getProjectTypes } from '../services/apiProjectTypes';
import { Loader2, Search, Plus, Tag, Check, Package as PackageIcon, ArrowRight, ArrowLeft, X, Printer, Calculator, FileText, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Project, Client, Package, NewInstallment } from '../types';
import { useState, useEffect } from 'react';
import { DateTimePicker } from './DateTimePicker';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { insertEvent, checkConnection } from '../services/apiGoogleCalendar';
import { toast } from 'sonner';

// Combined Schema for final submission check
const fullSchema = z.object({
    // Client
    client_id: z.string().optional(),
    is_new_client: z.boolean(),
    client_name: z.string().optional(), // For new client
    client_phone: z.string().optional(),
    client_tags: z.string().optional(),

    // Project
    title: z.string().min(1, "Proje başlığı zorunludur"),
    status_id: z.string().min(1, "Durum seçiniz"),
    type_id: z.string().optional(),
    start_date: z.string().optional(), // Format: "2026-01-10T10:00|2026-01-10T14:00" veya sadece "2026-01-10T10:00"
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
    const [customFeatures, setCustomFeatures] = useState<string[]>([]);
    const [newFeatureInput, setNewFeatureInput] = useState('');

    // Payment Plan State
    const [installments, setInstallments] = useState<NewInstallment[]>([]);
    const [depositType, setDepositType] = useState<'percentage' | 'fixed'>('percentage');
    const [depositValue, setDepositValue] = useState<number>(33.33);
    const [newInstallmentAmount, setNewInstallmentAmount] = useState<number>(0);
    const [newInstallmentDate, setNewInstallmentDate] = useState<string>('');
    const [newInstallmentNotes, setNewInstallmentNotes] = useState<string>('');

    // UI State
    const [isReadyToSubmit, setIsReadyToSubmit] = useState(false);

    // Google Calendar State
    const [addToCalendar, setAddToCalendar] = useState(true);
    const [isCalendarConnected, setIsCalendarConnected] = useState(false);

    useEffect(() => {
        checkConnection().then(setIsCalendarConnected);
    }, [isOpen]);

    // Queries
    const { data: statuses } = useQuery({ queryKey: ['statuses'], queryFn: getStatuses });
    const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: getClients });
    const { data: packages } = useQuery({ queryKey: ['packages'], queryFn: getPackages });
    const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: getProjects });
    const { data: projectTypes } = useQuery({ queryKey: ['project_types'], queryFn: getProjectTypes });
    const { data: contractSettings } = useQuery({
        queryKey: ['contractSettings'],
        queryFn: getContractSettings,
        staleTime: 0,
        refetchOnMount: true
    });

    // Helper for filtered clients
    const filteredClients = clients?.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Form
    const { register, handleSubmit, reset, setValue, watch, trigger, formState: { errors } } = useForm<ProjectFormValues>({
        mode: 'onChange',
        shouldUnregister: false,
        defaultValues: {
            title: '',
            type_id: '',
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
                setIsReadyToSubmit(false);
                setCustomFeatures([]);
                setNewFeatureInput('');
                setAddToCalendar(true); // Default to true for convenience
                reset();
            }, 300);
        }
    }, [isOpen, projectToEdit, reset]);

    // Varsayılan status olarak "Planlandı" ayarla
    useEffect(() => {
        if (isOpen && !isEditMode && statuses && statuses.length > 0) {
            const planlandiStatus = statuses.find(s => s.label?.toLowerCase() === 'planlandı');
            if (planlandiStatus && !watch('status_id')) {
                setValue('status_id', planlandiStatus.id);
            }
        }
    }, [isOpen, isEditMode, statuses, setValue, watch]);

    // Initial Load - Get Settings
    useEffect(() => {
        const fetchSettings = async () => {
            const type = await getSetting('default_deposit_type');
            if (type) setDepositType(type as any);
            const val = await getSetting('default_deposit_value');
            if (val) setDepositValue(parseFloat(val));
        };
        fetchSettings();
    }, []);

    // Calculate Total Price Helper
    const getTotalPrice = () => {
        const price = watch('custom_price');
        return price || 0;
    };

    // Auto-generate deposit on Step 5 entry if empty
    useEffect(() => {
        if (step === 5 && installments.length === 0) {
            const total = getTotalPrice();
            if (total > 0) {
                let amount = 0;
                if (depositType === 'percentage') {
                    amount = Math.round((total * depositValue) / 100);
                } else {
                    amount = Math.min(total, depositValue);
                }

                // Set default deposit date to today + 1 week (example convention)
                const today = new Date();
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);

                setInstallments([{
                    project_id: '', // Temporary
                    amount,
                    due_date: new Date().toISOString().split('T')[0], // Today for deposit usually
                    notes: 'Kapora'
                }]);
            }
        }
    }, [step]);

    // Safety lock for Final Step (Step 7 now)
    useEffect(() => {
        if (step === 7) {
            setIsReadyToSubmit(false);
            const timer = setTimeout(() => setIsReadyToSubmit(true), 800);
            return () => clearTimeout(timer);
        }
    }, [step]);

    // Handle Edit Mode Data Population
    useEffect(() => {
        if (projectToEdit && isOpen) {
            // Populate form...
            setValue('title', projectToEdit.title);
            setValue('status_id', projectToEdit.status_id);
            setValue('type_id', projectToEdit.type_id || '');

            // Format start and end date for DateTimePicker (start|end)
            let dateValue = projectToEdit.start_date || '';
            if (projectToEdit.start_date && projectToEdit.end_date) {
                dateValue = `${projectToEdit.start_date}|${projectToEdit.end_date}`;
            }
            setValue('start_date', dateValue);

            setValue('notes', projectToEdit.notes || '');
            setValue('custom_price', projectToEdit.price || 0);
            if (projectToEdit.client_name) {
                // Try to resolve client...
            }
        }
    }, [projectToEdit, isOpen, setValue]);


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

            // 2. Parse date range if present
            let startDate: string | undefined;
            let endDate: string | undefined;

            if (data.start_date) {
                const parts = data.start_date.split('|');
                startDate = parts[0]?.trim();
                endDate = parts[1]?.trim();
            }

            // 3. Create Project
            const projectPayload = {
                title: data.title,
                status_id: data.status_id,
                client_id: finalClientId,
                client_name: (data.is_new_client ? data.client_name : selectedClient?.name) || "",
                start_date: startDate ? (startDate.includes('T') ? new Date(startDate).toISOString() : new Date(`${startDate}T09:00:00`).toISOString()) : undefined,
                end_date: endDate ? new Date(endDate).toISOString() : undefined,
                notes: data.notes || undefined,
                type_id: data.type_id || null,
                price: data.custom_price || 0,
                details: selectedPackage
                    ? `Paket: ${selectedPackage.name}`
                    : customFeatures.length > 0
                        ? `Özel Paket: ${customFeatures.join(', ')}`
                        : undefined
            };

            if (isEditMode && projectToEdit) {
                return updateProject(projectToEdit.id, projectPayload);
            } else {
                return createProject(projectPayload);
            }
        },
        onSuccess: async (createdProject, variables) => {
            // Create installments if any
            if (installments.length > 0 && createdProject) {
                const installmentsWithProjectId = installments.map(i => ({
                    ...i,
                    project_id: createdProject.id
                }));
                await createInstallments(installmentsWithProjectId);
            }

            // Google Calendar Sync
            console.log('Google Sync Check:', { addToCalendar, isCalendarConnected, startDate: variables.start_date });

            if (addToCalendar && isCalendarConnected && variables.start_date) {
                try {
                    let eventPayload: any = {
                        summary: `[Proje] ${variables.title}`,
                        description: `Müşteri: ${variables.is_new_client ? variables.client_name : selectedClient?.name}\nNotlar: ${variables.notes || ''}`
                    };

                    const parts = variables.start_date.split('|');
                    const rawStart = parts[0]?.trim();
                    const rawEnd = parts[1]?.trim();

                    // Check if time is provided (e.g., contains 'T' and not strictly 00:00 or default)
                    // Our DateTimePicker provides T13:00:00 format.
                    const hasTime = rawStart?.includes('T');

                    if (hasTime) {
                        // TIMED EVENT
                        // Note: We use the raw strings directly if they are ISO/Local aware,
                        // but Google needs valid ISO with Timezone or UTC.
                        // Variables.start_date usually comes like "2026-01-17T13:00:00" (Local string if we built it that way)

                        eventPayload.start = {
                            dateTime: new Date(rawStart).toISOString(), // Convert Local string to UTC ISO
                            timeZone: 'Europe/Istanbul' // Optional: force timezone context
                        };

                        if (rawEnd) {
                            eventPayload.end = {
                                dateTime: new Date(rawEnd).toISOString()
                            };
                        } else {
                            // Default 1 hour duration
                            const d = new Date(rawStart);
                            d.setHours(d.getHours() + 1);
                            eventPayload.end = {
                                dateTime: d.toISOString()
                            };
                        }
                    } else {
                        // ALL DAY EVENT (Fallback logic)
                        let eventStartStr = variables.start_date.split('T')[0];
                        let eventEndStr = "";

                        // ... existing range logic ...
                        if (variables.start_date.includes('|')) {
                            const p = variables.start_date.split('|');
                            eventStartStr = p[0].split('T')[0];
                            if (p[1]) {
                                const endDateRaw = p[1].split('T')[0];
                                const d = new Date(endDateRaw);
                                d.setDate(d.getDate() + 1);
                                eventEndStr = d.toISOString().split('T')[0];
                            }
                        }

                        if (!eventEndStr) {
                            const d = new Date(eventStartStr);
                            d.setDate(d.getDate() + 1);
                            eventEndStr = d.toISOString().split('T')[0];
                        }

                        eventPayload.start = { date: eventStartStr };
                        eventPayload.end = { date: eventEndStr };
                    }

                    await insertEvent(eventPayload);
                    toast.success("Google Takvim'e eklendi.");
                } catch (error) {
                    console.error("Calendar Sync Error:", error);
                    toast.error("Google Takvim senkronizasyonu başarısız oldu.");
                }
            }

            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            onClose();
        },
        onError: (e) => {
            console.error(e);
            toast.error("Proje oluşturulurken bir hata oluştu: " + e.message);
        }
    });

    const onSubmit = (data: ProjectFormValues) => {
        // Edit mode bypasses steps
        if (isEditMode) {
            mutation.mutate(data);
            return;
        }

        // Creation mode must be on step 7
        if (step !== 7) return;

        // Double check safety
        if (!isReadyToSubmit) return;

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
                toast.error("Lütfen bir müşteri seçin veya yeni müşteri oluşturun.");
                return;
            }
        } else if (step === 2) {
            const valid = await trigger(['client_name', 'client_phone']);
            if (valid) setStep(3);
        } else if (step === 3) {
            const statusId = watch('status_id');
            if (!statusId) {
                toast.error("Lütfen bir 'Durum' seçiniz.");
                return;
            }

            const valid = await trigger(['title', 'status_id']);
            if (valid) {
                setStep(4);
            }
        } else if (step === 4) {
            // Validate price
            const price = watch('custom_price');
            if (!price || price <= 0) {
                if (!confirm("Fiyat girmediniz. Devam etmek istiyor musunuz?")) return;
            }
            setStep(5);
        } else if (step === 5) {
            setStep(6);
        } else if (step === 6) {
            setStep(7);
        }
    };

    const prevStep = () => {
        if (step === 2) setStep(1);
        else if (step === 3) setStep(isNewClientMode ? 2 : 1);
        else setStep(step - 1);
    };

    // Helper functions for Payment Plan
    const addInstallment = () => {
        if (newInstallmentAmount <= 0) {
            toast.error("Lütfen geçerli bir tutar giriniz.");
            return;
        }
        if (!newInstallmentDate) {
            toast.error("Lütfen tarih seçiniz.");
            return;
        }

        setInstallments([...installments, {
            project_id: '',
            amount: newInstallmentAmount,
            due_date: newInstallmentDate,
            notes: newInstallmentNotes || 'Taksit'
        }]);

        // Reset inputs
        setNewInstallmentAmount(0);
        setNewInstallmentDate('');
        setNewInstallmentNotes('');
    };

    const removeInstallment = (index: number) => {
        const newEx = [...installments];
        newEx.splice(index, 1);
        setInstallments(newEx);
    };

    const formatMoney = (amount: number) => {
        return `₺${amount.toLocaleString('tr-TR')}`;
    };

    // Contract Template Generator
    const getContractText = () => {
        const clientName = isNewClientMode ? watch('client_name') : selectedClient?.name || "......................................................................";
        const clientAddress = isNewClientMode ? "" : selectedClient?.address || ".....................................................................";
        const totalPrice = getTotalPrice();
        const today = format(new Date(), 'd MMMM yyyy', { locale: tr });

        let paymentPlanText = "";
        installments.forEach((inst, idx) => {
            paymentPlanText += `• ${idx + 1}. Ödeme: ${formatMoney(inst.amount)} - ${format(new Date(inst.due_date), 'd MMMM yyyy', { locale: tr })} (${inst.notes})\n`;
        });

        if (!paymentPlanText) paymentPlanText = "Peşin ödeme.";

        // Delivery content (package features) - Liste halinde
        let deliveryContent = "";
        const features = selectedPackage ? selectedPackage.features : customFeatures;
        if (features && features.length > 0) {
            features.forEach((feature) => {
                deliveryContent += `• ${feature}\n`;
            });
        } else {
            deliveryContent = "Belirtilmemiş.";
        }

        // Use template from settings or fallback
        let template = contractSettings?.template_content || `FOTOĞRAF VE VİDEO HİZMET SÖZLEŞMESİ

{{FIRMA_ADRES}} adresinde mukim {{FIRMA_ADI}} ({{FIRMA_SAHIBI}}) ile {{MUSTERI_ADI}} arasında sözleşme yapılmıştır.

Hizmet Bedeli: {{HIZMET_BEDELI}}
Ödeme Planı:
{{ODEME_PLANI}}

Teslimat İçeriği:
{{TESLIMAT_ICERIGI}}

Tarih: {{TARIH}}`;

        const highlightedFields = contractSettings?.highlighted_fields || [];

        const wrap = (key: string, value: string) => {
            if (highlightedFields.includes(key)) {
                return `%%%HL%%%${value}%%%HL_END%%%`;
            }
            return value;
        };

        // Replace all placeholders with wrapping logic
        template = template
            .replace(/\{\{MUSTERI_ADI\}\}/g, wrap('{{MUSTERI_ADI}}', clientName || '...'))
            .replace(/\{\{MUSTERI_ADRES\}\}/g, wrap('{{MUSTERI_ADRES}}', clientAddress || '...'))
            .replace(/\{\{HIZMET_BEDELI\}\}/g, wrap('{{HIZMET_BEDELI}}', formatMoney(totalPrice)))
            .replace(/\{\{ODEME_PLANI\}\}/g, wrap('{{ODEME_PLANI}}', paymentPlanText))
            .replace(/\{\{TESLIMAT_ICERIGI\}\}/g, wrap('{{TESLIMAT_ICERIGI}}', deliveryContent))
            .replace(/\{\{TARIH\}\}/g, wrap('{{TARIH}}', today))
            .replace(/\{\{FIRMA_ADI\}\}/g, wrap('{{FIRMA_ADI}}', contractSettings?.company_name || 'HAYALET FOTOĞRAF VE FİLM'))
            .replace(/\{\{FIRMA_ADRES\}\}/g, wrap('{{FIRMA_ADRES}}', contractSettings?.company_address || 'Sakarya Mh. 1113. Sk. 3-A Şehzadeler/Manisa'))
            .replace(/\{\{FIRMA_SAHIBI\}\}/g, wrap('{{FIRMA_SAHIBI}}', contractSettings?.company_owner || 'Cengiz Çimen'));
        return template;
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const contractText = getContractText();
            const highlightColor = contractSettings?.highlight_color || '#000000';

            // Generate font style tag
            const currentFontFamily = contractSettings?.font_family || 'Times New Roman';
            let fontImport = '';
            if (['Roboto', 'Nunito'].includes(currentFontFamily)) {
                fontImport = `<link href="https://fonts.googleapis.com/css2?family=${currentFontFamily}:wght@300;400;500;700&display=swap" rel="stylesheet">`;
            }

            // Stateful highlight processor for HTML
            let isHighlighted = false;
            const processHighlights = (text: string) => {
                const parts = text.split(/(%%%HL%%%|%%%HL_END%%%)/g);
                return parts.map(part => {
                    if (part === '%%%HL%%%') { isHighlighted = true; return ''; }
                    if (part === '%%%HL_END%%%') { isHighlighted = false; return ''; }

                    if (isHighlighted) {
                        return `<span style="color: ${highlightColor}; font-weight: bold;">${part}</span>`;
                    }
                    return part;
                }).join('');
            };

            printWindow.document.write(`
            <html>
                    <head>
                        <title>Sözleşme</title>
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        ${fontImport}
                        <style>
                            body { 
                                font-family: '${currentFontFamily}', serif; 
                                padding: 40px; 
                                line-height: 1.6; 
                                font-size: ${contractSettings?.font_size_body || 12}px; 
                                color: black;
                            }
                            @page { margin: 2cm; }
                            .logo-container { text-align: center; margin-bottom: 0px; line-height: 0; padding: 0; }
                            .logo { max-height: 100px; max-width: 250px; object-fit: contain; display: block; margin: 0 auto; }
                            h1 { text-align: center; font-size: ${contractSettings?.font_size_title || 16}px; margin-top: 0px; margin-bottom: 20px; font-weight: bold; }
                            h2, h3 { font-size: ${contractSettings?.font_size_heading || 14}px; margin-top: 15px; margin-bottom: 5px; font-weight: bold; }
                            p, div { margin-bottom: 5px; text-align: justify; white-space: pre-wrap; }
                            .signature { margin-top: 50px; display: flex; justify-content: space-between; }
                            @media print {
                                body { padding: 0; -webkit-print-color-adjust: exact; }
                            }
                        </style>
                    </head>
                    <body>
                        ${contractSettings?.logo_url ? `
                        <div class="logo-container">
                            <img src="${contractSettings.logo_url}" class="logo" alt="Logo" />
                        </div>
                        ` : ''}
                        <div class="content">
                            ${(() => {
                    isHighlighted = false; // Reset for full text processing
                    return contractText.split('\n').map((line, i) => {
                        const trimmedLine = line.trim();
                        const isHeader = trimmedLine.length > 0 && trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5 && trimmedLine.length < 100;
                        const isMainHeader = i === 0 || trimmedLine.includes('SÖZLEŞME');

                        const processedLine = processHighlights(line);

                        if (isMainHeader) return `<h1>${processedLine}</h1>`;
                        if (isHeader) return `<h3>${processedLine}</h3>`;
                        return `<div>${processedLine}</div>`;
                    }).join('');
                })()}
                        </div>
                        <script>
                            window.onload = function() { window.print(); }
                        </script>
                    </body>
            </html>
            `);
            printWindow.document.close();
        }
    };

    // RENDERERS
    const renderStep6_Contract = () => {
        const highlightColor = contractSettings?.highlight_color || '#000000';

        return (
            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="flex justify-between items-center mb-2">
                    <Label className="font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Sözleşme Önizleme
                    </Label>
                    <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                        <Printer className="w-4 h-4" /> Yazdır
                    </Button>
                </div>

                <div
                    className="border rounded-md p-8 bg-white h-[400px] overflow-y-auto shadow-inner text-xs md:text-sm whitespace-pre-wrap leading-relaxed contract-preview"
                    style={{
                        fontFamily: contractSettings?.font_family || 'Times New Roman',
                        fontSize: `${contractSettings?.font_size_body || 12}px`
                    }}
                >
                    {contractSettings?.logo_url && (
                        <div className="flex justify-center mb-6">
                            <img
                                src={contractSettings.logo_url}
                                alt="Logo"
                                className="max-h-20 max-w-[200px] object-contain"
                            />
                        </div>
                    )}
                    {(() => {
                        let isHighlighted = false;
                        return getContractText().split('\n').map((line, i) => {
                            const trimmedLine = line.trim();
                            const isHeader = trimmedLine.length > 0 && trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5 && trimmedLine.length < 100;
                            const isMainHeader = i === 0 || trimmedLine.includes('SÖZLEŞME');

                            // Render line with highlights
                            const renderLineContent = (text: string) => {
                                const parts = text.split(/(%%%HL%%%|%%%HL_END%%%)/g);
                                return parts.map((part, idx) => {
                                    if (part === '%%%HL%%%') { isHighlighted = true; return null; }
                                    if (part === '%%%HL_END%%%') { isHighlighted = false; return null; }

                                    if (isHighlighted) {
                                        return <span key={idx} style={{ color: highlightColor, fontWeight: 'bold' }}>{part}</span>;
                                    }
                                    return <span key={idx}>{part}</span>;
                                });
                            };

                            return (
                                <div
                                    key={i}
                                    style={{
                                        minHeight: '1.2em',
                                        fontSize: isMainHeader ? `${contractSettings?.font_size_title || 16}px` : (isHeader ? `${contractSettings?.font_size_heading || 14}px` : undefined),
                                        fontWeight: (isHeader || isMainHeader) ? 'bold' : 'normal',
                                        textAlign: isMainHeader ? 'center' : 'left',
                                        marginTop: (isHeader || isMainHeader) ? '1.5em' : '0',
                                        marginBottom: (isHeader || isMainHeader) ? '4px' : '2px',
                                        lineHeight: 1.5,
                                        whiteSpace: 'pre-wrap'
                                    }}
                                >
                                    {renderLineContent(line)}
                                </div>
                            );
                        });
                    })()}
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-700 rounded-md text-xs">
                    <div className="mt-0.5"><Check className="w-4 h-4" /></div>
                    <div>
                        Sözleşme taslağı yukarıdaki gibidir. Yazdır butonunu kullanarak çıktısını alabilir ve müşteriye imzalatabilirsiniz. Proje oluşturulduktan sonra da sözleşmeye erişebilirsiniz.
                    </div>
                </div>
            </div>
        );
    };

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
                    onClick={() => { setIsNewClientMode(true); setValue('is_new_client', true); setSelectedClient(null); setStep(2); }}
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

                {filteredClients?.map(client => {
                    // Dinamik Aktiflik Kontrolü
                    const clientProjects = projects?.filter(p => p.client_id === client.id) || [];

                    // Tamamlanmamış projesi var mı?
                    const activeProjects = clientProjects.filter(p => {
                        const status = statuses?.find(s => s.id === p.status_id);
                        return status?.label?.toLowerCase() !== 'tamamlandı';
                    });

                    const isActive = activeProjects.length > 0;

                    return (
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
                                {isActive ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium border border-green-200">Aktif</span>
                                ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Pasif</span>
                                )}
                                {selectedClient?.id === client.id && <Check className="h-4 w-4 text-primary" />}
                            </div>
                        </button>
                    );
                })}

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
        <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid gap-2">
                <Label>Proje Başlığı</Label>
                <Input {...register('title')} placeholder="Örn. 2024 Yaz Kataloğu" autoFocus />
                {errors.title && <span className="text-xs text-red-500">{errors.title.message}</span>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Durum</Label>
                    <select
                        {...register('status_id')}
                        className={cn(
                            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                            errors.status_id ? "border-red-500" : ""
                        )}
                    >
                        <option value="" disabled>Seçiniz</option>
                        {statuses?.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    {errors.status_id && <span className="text-xs text-red-500">{errors.status_id.message}</span>}
                </div>
                <div className="grid gap-2">
                    <Label>Proje Türü</Label>
                    <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...register('type_id')}
                    >
                        <option value="">Seçiniz (Opsiyonel)</option>
                        {projectTypes?.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                </div>
                <div className="grid gap-2">
                    <Label>Notlar</Label>
                    <Input {...register('notes')} placeholder="Detaylar..." />
                </div>
            </div>
            <DateTimePicker
                value={watch('start_date')}
                onChange={(value) => setValue('start_date', value)}
            />
        </div>
    );

    const renderStep4_Packages = () => (
        <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
                <div
                    onClick={() => {
                        if (selectedPackage !== null) {
                            setSelectedPackage(null);
                            setValue('custom_price', 0);
                        }
                    }}
                    className={cn(
                        "flex items-start p-4 rounded-xl border text-left transition-all cursor-pointer",
                        selectedPackage === null ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                    )}
                >
                    <div className="flex-1">
                        <div className="font-semibold flex items-center">
                            <PackageIcon className="h-4 w-4 mr-2" /> Özel / Paketsiz
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                            Kendi fiyatınızı ve özelliklerinizi belirleyin.
                        </div>

                        {selectedPackage === null && (
                            <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                                <div className="text-sm font-medium text-primary">
                                    <Label>Fiyat (₺)</Label>
                                    <Input
                                        type="number"
                                        className="mt-1 w-32 bg-white"
                                        {...register('custom_price', { valueAsNumber: true })}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Paket Özellikleri</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newFeatureInput}
                                            onChange={(e) => setNewFeatureInput(e.target.value)}
                                            placeholder="Örn. 2 Saat Çekim"
                                            className="bg-white h-8 text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (newFeatureInput.trim()) {
                                                        setCustomFeatures([...customFeatures, newFeatureInput.trim()]);
                                                        setNewFeatureInput('');
                                                    }
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-8"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (newFeatureInput.trim()) {
                                                    setCustomFeatures([...customFeatures, newFeatureInput.trim()]);
                                                    setNewFeatureInput('');
                                                }
                                            }}
                                        >
                                            Ekle
                                        </Button>
                                    </div>

                                    {customFeatures.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {customFeatures.map((feature, index) => (
                                                <div key={index} className="flex items-center gap-1 bg-white border rounded px-2 py-1 text-sm shadow-sm">
                                                    <span>{feature}</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCustomFeatures(customFeatures.filter((_, i) => i !== index));
                                                        }}
                                                        className="text-muted-foreground hover:text-red-500"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {packages?.map(pkg => (
                    <div
                        key={pkg.id}
                        onClick={() => { setSelectedPackage(pkg); setValue('custom_price', pkg.price); setValue('package_id', pkg.id); }}
                        className={cn(
                            "flex items-start p-4 rounded-xl border text-left transition-all cursor-pointer",
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
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep5_PaymentPlan = () => {
        const totalPrice = getTotalPrice();
        const totalPlanned = installments.reduce((acc, curr) => acc + curr.amount, 0);
        const remaining = totalPrice - totalPlanned;

        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="flex justify-between items-center p-4 bg-muted/20 rounded-lg border">
                    <div>
                        <div className="text-sm text-muted-foreground">Toplam Tutar</div>
                        <div className="text-2xl font-bold text-primary">{formatMoney(totalPrice)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-muted-foreground">Planlanan</div>
                        <div className={cn("text-xl font-semibold", remaining === 0 ? "text-green-600" : "text-amber-600")}>
                            {formatMoney(totalPlanned)}
                        </div>
                        {remaining !== 0 && (
                            <div className="text-xs text-red-500 font-medium">Kalan: {formatMoney(remaining)}</div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="font-semibold flex items-center gap-2">
                        <Calculator className="w-4 h-4" /> Ödeme Planı Oluştur
                    </Label>

                    {/* Add Installment Form */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-3 border rounded-lg bg-card">
                        <div className="md:col-span-1">
                            <Label className="text-xs mb-1.5 block">Tutar</Label>
                            <Input
                                type="number"
                                value={newInstallmentAmount || ''}
                                onChange={e => setNewInstallmentAmount(parseFloat(e.target.value))}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <Label className="text-xs mb-1.5 block">Tarih</Label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={newInstallmentDate}
                                    onChange={e => setNewInstallmentDate(e.target.value)}
                                    className="block"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <Label className="text-xs mb-1.5 block">Not / Açıklama</Label>
                            <Input
                                value={newInstallmentNotes}
                                onChange={e => setNewInstallmentNotes(e.target.value)}
                                placeholder="Örn: 2. Taksit"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <Button type="button" onClick={addInstallment} className="w-full" disabled={!newInstallmentAmount || !newInstallmentDate}>
                                <Plus className="w-4 h-4 mr-1" /> Ekle
                            </Button>
                        </div>
                    </div>

                    {/* Installments List */}
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {installments.length === 0 ? (
                            <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                                Henüz taksit eklenmedi. Toplam tutarı taksitlendirmek için yukarıdan ekleme yapın.
                            </div>
                        ) : (
                            installments.map((inst, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-semibold">{formatMoney(inst.amount)}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(inst.due_date), 'd MMMM yyyy', { locale: tr })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-sm font-medium text-muted-foreground">{inst.notes}</div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeInstallment(idx)}
                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };



    const renderStep7_Summary = () => {
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
                        <span className="text-muted-foreground">Tarih / Saat</span>
                        <span className="font-medium text-right">
                            {formData.start_date ? (() => {
                                const parts = formData.start_date.split('|');
                                if (parts.length === 2) {
                                    const start = parts[0].split('T');
                                    const end = parts[1].split('T');
                                    return (
                                        <div>
                                            <div>{start[0]}</div>
                                            <div className="text-primary font-bold">{start[1]} - {end[1]}</div>
                                        </div>
                                    );
                                }
                                return formData.start_date;
                            })() : 'Belirtilmedi'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <span className="text-muted-foreground">Paket / Tutar</span>
                        <div className="text-right">
                            <div className="font-bold text-lg text-primary">₺{formData.custom_price?.toLocaleString('tr-TR')}</div>
                            {selectedPackage ? (
                                <div className="text-xs text-muted-foreground">{selectedPackage.name}</div>
                            ) : customFeatures.length > 0 ? (
                                <div className="text-xs text-muted-foreground">
                                    <div className="font-medium mb-1">Özel Paket Özellikleri:</div>
                                    <ul className="list-disc list-inside">
                                        {customFeatures.map((f, i) => (
                                            <li key={i}>{f}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground">Özel / Paketsiz</div>
                            )}
                        </div>
                    </div>

                    {isCalendarConnected && (
                        <div className="flex items-center space-x-2 pt-2 border-t">
                            <input
                                type="checkbox"
                                id="addToCalendarProject"
                                checked={addToCalendar}
                                onChange={(e) => setAddToCalendar(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="addToCalendarProject" className="cursor-pointer text-sm text-blue-700 font-medium flex items-center gap-1">
                                <Calendar className="w-4 h-4" /> Projeyi Google Takvimim'e ekle
                            </Label>
                        </div>
                    )}
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
                description="Proje detaylarını buradan güncelleyebilirsiniz."
                className="max-w-4xl"
            >
                <div className="max-h-[85vh] overflow-y-auto px-1 -mx-1">
                    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-5 pb-4">

                        {/* Temel Bilgiler Grubu */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Proje Başlığı</Label>
                                <Input {...register('title')} className="h-10 font-medium" />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Müşteri</Label>
                                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                                    {projectToEdit.client_name || 'İsimsiz Müşteri'}
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* Durum ve Finans */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Durum</Label>
                                <select
                                    {...register('status_id')}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {statuses?.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Fiyat (₺)</Label>
                                <Input type="number" {...register('custom_price', { valueAsNumber: true })} className="h-10" />
                            </div>
                        </div>

                        {/* Zamanlama */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Tarih ve Saat Aralığı</Label>
                            <div className="border rounded-md p-1 bg-card">
                                <DateTimePicker
                                    value={watch('start_date')}
                                    onChange={(value) => setValue('start_date', value)}
                                />
                            </div>
                        </div>


                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Notlar</Label>
                            <Input {...register('notes')} className="h-10" placeholder="Proje ile ilgili notlar..." />
                        </div>

                        <div className="flex justify-end gap-3 mt-2 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={onClose} className="h-10 px-6">İptal</Button>
                            <Button type="submit" disabled={mutation.isPending} className="h-10 px-6 bg-green-600 hover:bg-green-700">
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Değişiklikleri Kaydet
                            </Button>
                        </div>
                    </form>
                </div>
            </Dialog>
        );
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={`Yeni Proje - Adım ${step}/7`
            }
            description={
                step === 1 ? "Müşteri seçin veya yeni oluşturun." :
                    step === 2 ? "Yeni müşteri detaylarını girin." :
                        step === 3 ? "Proje detaylarını girin." :
                            step === 4 ? "Bir paket seçin veya fiyat belirleyin." :
                                step === 5 ? "Ödeme planını oluşturun." :
                                    step === 6 ? "Sözleşmeyi inceleyin ve yazdırın." :
                                        "Bilgileri kontrol edip onaylayın."
            }
            className="max-w-4xl"
        >
            <div className="mt-4">
                {/* Steps Indicator */}
                <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5, 6, 7].map(s => (
                        <div key={s} className={cn("h-1 flex-1 rounded-full transition-all", s <= step ? "bg-primary" : "bg-muted")} />
                    ))}
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                    {step === 1 && renderStep1_ClientSelect()}
                    {step === 2 && renderStep2_NewClient()}
                    {step === 3 && renderStep3_ProjectInfo()}
                    {step === 4 && renderStep4_Packages()}
                    {step === 5 && renderStep5_PaymentPlan()}
                    {step === 6 && renderStep6_Contract()}
                    {step === 7 && renderStep7_Summary()}

                    <div className="flex justify-between mt-6 pt-4 border-t">
                        {step > 1 ? (
                            <Button type="button" variant="outline" onClick={prevStep}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                            </Button>
                        ) : (
                            <Button type="button" variant="ghost" onClick={onClose}>İptal</Button>
                        )}

                        {step < 7 ? (
                            <Button type="button" onClick={nextStep} disabled={step === 1 && !selectedClient && !isNewClientMode}>
                                İleri <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={mutation.isPending || !isReadyToSubmit}
                                className={cn(
                                    "transition-all",
                                    isReadyToSubmit ? "bg-green-600 hover:bg-green-700" : "bg-muted text-muted-foreground"
                                )}
                            >
                                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {!isReadyToSubmit ? "Lütfen bekleyin..." : "Onayla ve Oluştur"}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </Dialog >
    );
}
