import { supabase } from '../lib/supabase';
import type { Project } from '../types';

export const getProjects = async () => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return data as Project[];
};

export const createProject = async (project: Omit<Project, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('projects')
        .insert([project])
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as Project;
};

export const updateProjectStatus = async (id: string, statusId: string) => {
    const { data, error } = await supabase
        .from('projects')
        .update({ status_id: statusId })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating project status:', error);
        throw error;
    }

    return data;
};

export const updateProject = async (id: string, project: Partial<Omit<Project, 'id' | 'created_at'>>) => {
    const { data, error } = await supabase
        .from('projects')
        .update(project)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating project:', error);
        throw error;
    }

    return data;
};

export const deleteProject = async (id: string) => {
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(error.message);
    }
};
