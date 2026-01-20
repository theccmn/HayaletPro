import { supabase } from "../lib/supabase";
import type { ProjectType } from "../types";

export const getProjectTypes = async (): Promise<ProjectType[]> => {
    const { data, error } = await supabase
        .from('project_types')
        .select('*')
        .order('order', { ascending: true });

    if (error) {
        console.error('Error fetching project types:', error);
        throw error;
    }

    return data || [];
};

export const createProjectType = async (type: Omit<ProjectType, 'id'>): Promise<ProjectType> => {
    const { data, error } = await supabase
        .from('project_types')
        .insert([type])
        .select()
        .single();

    if (error) {
        console.error('Error creating project type:', error);
        throw error;
    }

    return data;
};

export const updateProjectType = async (id: string, updates: Partial<ProjectType>): Promise<ProjectType> => {
    const { data, error } = await supabase
        .from('project_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating project type:', error);
        throw error;
    }

    return data;
};

export const updateProjectTypeOrder = async (updates: { id: string; order: number }[]): Promise<void> => {
    const promises = updates.map(({ id, order }) =>
        supabase.from('project_types').update({ order }).eq('id', id)
    );

    const results = await Promise.all(promises);

    const error = results.find(r => r.error)?.error;
    if (error) {
        console.error('Error updating project type order:', error);
        throw error;
    }
};

export const deleteProjectType = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('project_types')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting project type:', error);
        throw error;
    }
};
