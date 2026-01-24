import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface MessageTemplate {
    id: string;
    name: string;
    description?: string;
    blocks: any[]; // JSON structure
    created_at: string;
    updated_at: string;
    is_active: boolean;
}

export const getTemplates = async () => {
    const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as MessageTemplate[];
};

export const getTemplateById = async (id: string) => {
    const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as MessageTemplate;
};

export const createTemplate = async (template: Partial<MessageTemplate>) => {
    const { data, error } = await supabase
        .from('message_templates')
        .insert([{
            id: uuidv4(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true,
            ...template
        }])
        .select()
        .single();

    if (error) throw error;
    return data as MessageTemplate;
};

export const updateTemplate = async (id: string, updates: Partial<MessageTemplate>) => {
    const { data, error } = await supabase
        .from('message_templates')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as MessageTemplate;
};

export const deleteTemplate = async (id: string) => {
    const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
