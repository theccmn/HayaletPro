

export interface MessageTemplate {
    id: string;
    name: string;
    description?: string;
    blocks: any[]; // JSON
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
