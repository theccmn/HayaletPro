// Workflow Trigger Types
export type TriggerType = 'event' | 'schedule';

// Event-based triggers
export type TriggerEvent = 
    | 'project_created'
    | 'project_status_changed'
    | 'project_cancelled'
    | 'photo_selection_completed';

// Schedule-based triggers
export type ScheduleType = 'before_project_date' | 'after_project_date';

// Channel types
export interface WorkflowChannels {
    email: boolean;
    whatsapp: boolean;
}

// Trigger condition for status changes
export interface TriggerCondition {
    from_status_id?: string;
    to_status_id?: string;
}

// Main Workflow interface
export interface Workflow {
    id: string;
    name: string;
    description?: string;
    
    // Trigger configuration
    trigger_type: TriggerType;
    trigger_event?: TriggerEvent;
    trigger_condition?: TriggerCondition;
    
    // Schedule configuration
    schedule_type?: ScheduleType;
    schedule_offset?: number; // in minutes
    
    // Template and channels
    template_id?: string;
    channels: WorkflowChannels;
    
    // Status
    is_active: boolean;
    
    // Timestamps
    created_at: string;
    updated_at: string;
    
    // Joined data (optional)
    message_templates?: {
        id: string;
        name: string;
    };
}

// Workflow Execution Log
export interface WorkflowExecution {
    id: string;
    workflow_id: string;
    project_id?: string;
    client_id?: string;
    channel: 'email' | 'whatsapp';
    status: 'pending' | 'sent' | 'failed' | 'clicked';
    error_message?: string;
    message_preview?: string;
    executed_at: string;
}

// Trigger options for UI
export const TRIGGER_EVENT_OPTIONS: { value: TriggerEvent; label: string; description: string }[] = [
    { 
        value: 'project_created', 
        label: 'Proje Oluşturuldu', 
        description: 'Yeni bir proje oluşturulduğunda' 
    },
    { 
        value: 'project_status_changed', 
        label: 'Proje Durumu Değişti', 
        description: 'Kanban\'da durum değiştiğinde' 
    },
    { 
        value: 'project_cancelled', 
        label: 'Proje İptal Edildi', 
        description: 'Bir proje iptal edildiğinde' 
    },
    { 
        value: 'photo_selection_completed', 
        label: 'Fotoğraf Seçimi Tamamlandı', 
        description: 'Müşteri fotoğraf seçimini tamamladığında' 
    },
];

export const SCHEDULE_TYPE_OPTIONS: { value: ScheduleType; label: string }[] = [
    { value: 'before_project_date', label: 'Proje Tarihinden Önce' },
    { value: 'after_project_date', label: 'Proje Tarihinden Sonra' },
];

export const SCHEDULE_OFFSET_OPTIONS: { value: number; label: string }[] = [
    { value: 60, label: '1 Saat' },
    { value: 120, label: '2 Saat' },
    { value: 180, label: '3 Saat' },
    { value: 360, label: '6 Saat' },
    { value: 720, label: '12 Saat' },
    { value: 1440, label: '1 Gün' },
    { value: 2880, label: '2 Gün' },
    { value: 4320, label: '3 Gün' },
    { value: 10080, label: '1 Hafta' },
];
