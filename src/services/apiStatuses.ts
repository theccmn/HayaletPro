import { supabase } from "../lib/supabase";
import type { ProjectStatus } from "../types";

export const getStatuses = async (): Promise<ProjectStatus[]> => {
    const { data, error } = await supabase
        .from('project_statuses')
        .select('*')
        .order('order', { ascending: true });

    if (error) {
        console.error('Error fetching statuses:', error);
        throw error;
    }

    return data || [];
};

export const createStatus = async (status: Omit<ProjectStatus, 'id'>): Promise<ProjectStatus> => {
    const { data, error } = await supabase
        .from('project_statuses')
        .insert([status])
        .select()
        .single();

    if (error) {
        console.error('Error creating status:', error);
        throw error;
    }

    return data;
};

export const updateStatus = async (id: string, updates: Partial<ProjectStatus>): Promise<ProjectStatus> => {
    const { data, error } = await supabase
        .from('project_statuses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating status:', error);
        throw error;
    }

    return data;
};

export const updateStatusOrder = async (updates: { id: string; order: number }[]): Promise<void> => {
    // Supabase doesn't support bulk update easily in one go without a stored procedure or multiple requests
    // For a small number of statuses, Promise.all is acceptable.
    const promises = updates.map(({ id, order }) =>
        supabase.from('project_statuses').update({ order }).eq('id', id)
    );

    const results = await Promise.all(promises);

    // Check for errors
    const error = results.find(r => r.error)?.error;
    if (error) {
        console.error('Error updating status order:', error);
        throw error;
    }
};

export const deleteStatus = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('project_statuses')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting status:', error);
        throw error;
    }
};
