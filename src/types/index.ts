export interface ProjectStatus {
    id: string;
    label: string;
    order: number;
    color: string;
}

export interface Project {
    id: string;
    title: string;
    client_name: string;
    phone?: string;
    email?: string;
    start_date?: string;
    end_date?: string;
    status_id: string; // Updated to reference ProjectStatus
    details?: string;
    notes?: string;
    price?: number;
    client_id?: string | null;
    created_at?: string;
    photo_selections?: any; // Using any to support both object and array return types from joins
}

// Transaction Interface
export interface Transaction {
    id: string;
    title: string;
    amount: number;
    category: string;
    type: 'income' | 'expense';
    date: string;
    project_id?: string | null;
    job_date?: string;
    created_at?: string;
    projects?: {
        title: string;
    } | null;
}

export type NewTransaction = Omit<Transaction, 'id' | 'created_at' | 'projects'>;

export interface Client {
    id: string;
    name: string;
    company?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    project_count?: number;
    tags?: string[];
    status?: 'active' | 'passive';
    created_at?: string;
}

export type NewClient = Omit<Client, 'id' | 'created_at' | 'project_count'>;

export interface Package {
    id: string;
    name: string;
    description?: string;
    price: number;
    features?: string[];
    created_at?: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    purchase_date?: string;
    price: number;
    status: 'available' | 'rented' | 'maintenance' | 'lost';
    notes?: string;
    created_at?: string;
}

export type NewInventoryItem = Omit<InventoryItem, 'id' | 'created_at'>;

export interface Expense {
    id: string;
    title: string;
    amount: number;
    category: string;
    date: string;
    project_id?: string | null;
    created_at?: string;
    projects?: {
        title: string;
    } | null;
}
