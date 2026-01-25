import { useState, useEffect } from 'react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import {
    Zap,
    Clock,
    ChevronRight,
    ChevronLeft,
    Mail,
    MessageCircle,
    Check,
    FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import type {
    Workflow,
    TriggerType,
    TriggerEvent,
    ScheduleType
} from '../types/workflow';
import {
    TRIGGER_EVENT_OPTIONS,
    SCHEDULE_TYPE_OPTIONS,
    SCHEDULE_OFFSET_OPTIONS
} from '../types/workflow';
import { createWorkflow, updateWorkflow } from '../services/apiWorkflows';
import { getTemplates } from '../services/apiTemplates';
import type { MessageTemplate } from '../services/apiTemplates';
import { getStatuses } from '../services/apiStatuses';
import type { ProjectStatus } from '../types';

interface WorkflowDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    workflow?: Workflow | null;
}

export const WorkflowDialog = ({ isOpen, onClose, onSuccess, workflow }: WorkflowDialogProps) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [statuses, setStatuses] = useState<ProjectStatus[]>([]);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [triggerType, setTriggerType] = useState<TriggerType>('event');
    const [triggerEvent, setTriggerEvent] = useState<TriggerEvent | ''>('');
    const [fromStatusId, setFromStatusId] = useState<string>('');
    const [toStatusId, setToStatusId] = useState<string>('');
    const [scheduleType, setScheduleType] = useState<ScheduleType | ''>('');
    const [scheduleOffset, setScheduleOffset] = useState<number>(1440);
    const [templateId, setTemplateId] = useState<string>('');
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);

    // Load templates and statuses
    useEffect(() => {
        const loadData = async () => {
            try {
                const [templatesData, statusesData] = await Promise.all([
                    getTemplates(),
                    getStatuses()
                ]);
                setTemplates(templatesData);
                setStatuses(statusesData);
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };
        if (isOpen) loadData();
    }, [isOpen]);

    // Populate form when editing
    useEffect(() => {
        if (workflow) {
            setName(workflow.name);
            setDescription(workflow.description || '');
            setTriggerType(workflow.trigger_type);
            setTriggerEvent((workflow.trigger_event as TriggerEvent) || '');
            setFromStatusId(workflow.trigger_condition?.from_status_id || '');
            setToStatusId(workflow.trigger_condition?.to_status_id || '');
            setScheduleType((workflow.schedule_type as ScheduleType) || '');
            setScheduleOffset(workflow.schedule_offset || 1440);
            setTemplateId(workflow.template_id || '');
            setEmailEnabled(workflow.channels?.email || false);
            setWhatsappEnabled(workflow.channels?.whatsapp || false);
        } else {
            resetForm();
        }
    }, [workflow, isOpen]);

    const resetForm = () => {
        setStep(1);
        setName('');
        setDescription('');
        setTriggerType('event');
        setTriggerEvent('');
        setFromStatusId('');
        setToStatusId('');
        setScheduleType('');
        setScheduleOffset(1440);
        setTemplateId('');
        setEmailEnabled(false);
        setWhatsappEnabled(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const validateStep = (stepNum: number): boolean => {
        switch (stepNum) {
            case 1:
                if (!name.trim()) {
                    toast.error('İş akışı adı gerekli');
                    return false;
                }
                return true;
            case 2:
                if (triggerType === 'event' && !triggerEvent) {
                    toast.error('Bir tetikleyici olay seçin');
                    return false;
                }
                if (triggerType === 'schedule' && !scheduleType) {
                    toast.error('Zamanlama türü seçin');
                    return false;
                }
                return true;
            case 3:
                if (!templateId) {
                    toast.error('Bir mesaj şablonu seçin');
                    return false;
                }
                return true;
            case 4:
                if (!emailEnabled && !whatsappEnabled) {
                    toast.error('En az bir gönderim kanalı seçin');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(prev => Math.min(prev + 1, 4));
        }
    };

    const handleBack = () => {
        setStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        if (!validateStep(4)) return;

        setLoading(true);
        try {
            const workflowData: Partial<Workflow> = {
                name,
                description: description || undefined,
                trigger_type: triggerType,
                trigger_event: triggerType === 'event' ? triggerEvent as TriggerEvent : undefined,
                trigger_condition: triggerEvent === 'project_status_changed'
                    ? { from_status_id: fromStatusId || undefined, to_status_id: toStatusId || undefined }
                    : undefined,
                schedule_type: triggerType === 'schedule' ? scheduleType as ScheduleType : undefined,
                schedule_offset: triggerType === 'schedule' ? scheduleOffset : undefined,
                template_id: templateId,
                channels: { email: emailEnabled, whatsapp: whatsappEnabled },
            };

            if (workflow) {
                await updateWorkflow(workflow.id, workflowData);
                toast.success('İş akışı güncellendi');
            } else {
                await createWorkflow(workflowData);
                toast.success('İş akışı oluşturuldu');
            }

            onSuccess();
        } catch (error) {
            console.error('Error saving workflow:', error);
            toast.error('İş akışı kaydedilemedi');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { num: 1, label: 'Bilgiler' },
        { num: 2, label: 'Tetikleyici' },
        { num: 3, label: 'Şablon' },
        { num: 4, label: 'Kanallar' },
    ];

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title={workflow ? 'İş Akışını Düzenle' : 'Yeni İş Akışı Oluştur'}
            className="max-w-2xl"
        >
            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-2 py-4 border-b -mx-6 px-6">
                {steps.map((s, idx) => (
                    <div key={s.num} className="flex items-center">
                        <div
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                                step === s.num
                                    ? "bg-primary text-primary-foreground"
                                    : step > s.num
                                        ? "bg-primary/20 text-primary"
                                        : "bg-muted text-muted-foreground"
                            )}
                        >
                            {step > s.num ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                <span>{s.num}</span>
                            )}
                            <span className="hidden sm:inline">{s.label}</span>
                        </div>
                        {idx < steps.length - 1 && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                        )}
                    </div>
                ))}
            </div>

            {/* Step content */}
            <div className="py-6 min-h-[300px]">
                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">İş Akışı Adı *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                                placeholder="Örn: Randevu Hatırlatıcı"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Açıklama</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                                placeholder="Bu iş akışının ne yaptığını açıklayın..."
                                rows={3}
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Trigger */}
                {step === 2 && (
                    <div className="space-y-6">
                        {/* Trigger Type Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setTriggerType('event')}
                                className={cn(
                                    "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all",
                                    triggerType === 'event'
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50"
                                )}
                            >
                                <div className={cn(
                                    "p-3 rounded-full",
                                    triggerType === 'event' ? "bg-amber-100 text-amber-600" : "bg-muted"
                                )}>
                                    <Zap className="h-6 w-6" />
                                </div>
                                <div className="text-center">
                                    <p className="font-medium">Olay Bazlı</p>
                                    <p className="text-sm text-muted-foreground">
                                        Bir işlem gerçekleştiğinde
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTriggerType('schedule')}
                                className={cn(
                                    "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all",
                                    triggerType === 'schedule'
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50"
                                )}
                            >
                                <div className={cn(
                                    "p-3 rounded-full",
                                    triggerType === 'schedule' ? "bg-blue-100 text-blue-600" : "bg-muted"
                                )}>
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div className="text-center">
                                    <p className="font-medium">Zaman Bazlı</p>
                                    <p className="text-sm text-muted-foreground">
                                        Belirli bir süre önce/sonra
                                    </p>
                                </div>
                            </button>
                        </div>

                        {/* Event-based options */}
                        {triggerType === 'event' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Tetikleyici Olay *</Label>
                                    <Select value={triggerEvent} onValueChange={(v: string) => setTriggerEvent(v as TriggerEvent)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Bir olay seçin..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TRIGGER_EVENT_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Status change condition */}
                                {triggerEvent === 'project_status_changed' && (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                        <div className="space-y-2">
                                            <Label>Önceki Durum (opsiyonel)</Label>
                                            <Select value={fromStatusId} onValueChange={setFromStatusId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Herhangi" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">Herhangi</SelectItem>
                                                    {statuses.map((status) => (
                                                        <SelectItem key={status.id} value={status.id}>
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-3 h-3 rounded-full"
                                                                    style={{ backgroundColor: status.color }}
                                                                />
                                                                {status.label}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Yeni Durum (opsiyonel)</Label>
                                            <Select value={toStatusId} onValueChange={setToStatusId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Herhangi" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">Herhangi</SelectItem>
                                                    {statuses.map((status) => (
                                                        <SelectItem key={status.id} value={status.id}>
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-3 h-3 rounded-full"
                                                                    style={{ backgroundColor: status.color }}
                                                                />
                                                                {status.label}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Schedule-based options */}
                        {triggerType === 'schedule' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Zamanlama *</Label>
                                    <Select value={scheduleOffset.toString()} onValueChange={(v: string) => setScheduleOffset(Number(v))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Süre seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SCHEDULE_OFFSET_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value.toString()}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Zaman Tipi *</Label>
                                    <Select value={scheduleType} onValueChange={(v: string) => setScheduleType(v as ScheduleType)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seçin..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SCHEDULE_TYPE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Template Selection */}
                {step === 3 && (
                    <div className="space-y-4">
                        <Label>Mesaj Şablonu Seçin *</Label>
                        {templates.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>Henüz mesaj şablonu oluşturulmamış</p>
                                <p className="text-sm">Önce Şablonlar sayfasından şablon oluşturun</p>
                            </div>
                        ) : (
                            <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
                                {templates.map((template) => (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => setTemplateId(template.id)}
                                        className={cn(
                                            "flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all",
                                            templateId === template.id
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-lg shrink-0",
                                            templateId === template.id
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}>
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{template.name}</p>
                                            {template.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {template.description}
                                                </p>
                                            )}
                                        </div>
                                        {templateId === template.id && (
                                            <Check className="h-5 w-5 text-primary shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: Channels */}
                {step === 4 && (
                    <div className="space-y-4">
                        <Label>Gönderim Kanalları</Label>
                        <p className="text-sm text-muted-foreground">
                            Bildirimlerin hangi kanallardan gönderileceğini seçin
                        </p>

                        <div className="space-y-3">
                            {/* Email Channel */}
                            <div className={cn(
                                "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                                emailEnabled ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-border"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2.5 rounded-full",
                                        emailEnabled ? "bg-blue-500 text-white" : "bg-muted"
                                    )}>
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">E-posta</p>
                                        <p className="text-sm text-muted-foreground">
                                            E-posta ile gönder
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={emailEnabled}
                                    onCheckedChange={setEmailEnabled}
                                />
                            </div>

                            {/* WhatsApp Channel */}
                            <div className={cn(
                                "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                                whatsappEnabled ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-border"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2.5 rounded-full",
                                        whatsappEnabled ? "bg-green-500 text-white" : "bg-muted"
                                    )}>
                                        <MessageCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">WhatsApp</p>
                                        <p className="text-sm text-muted-foreground">
                                            WhatsApp uygulamasını açar
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={whatsappEnabled}
                                    onCheckedChange={setWhatsappEnabled}
                                />
                            </div>
                        </div>

                        {whatsappEnabled && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                                💡 WhatsApp seçildiğinde, bir bildirim gösterilir ve tıklandığında WhatsApp uygulaması mesaj ile birlikte açılır.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t -mx-6 px-6 -mb-6 pb-6">
                <Button
                    variant="outline"
                    onClick={step === 1 ? handleClose : handleBack}
                    disabled={loading}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {step === 1 ? 'İptal' : 'Geri'}
                </Button>

                {step < 4 ? (
                    <Button onClick={handleNext}>
                        İleri
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                ) : (
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Kaydediliyor...' : (workflow ? 'Güncelle' : 'Oluştur')}
                    </Button>
                )}
            </div>
        </Dialog>
    );
};
