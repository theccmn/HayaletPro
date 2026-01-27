import { supabase } from "../lib/supabase";
import type { Task, NewTask } from "../types";

export const getTasks = async (projectId: string): Promise<Task[]> => {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
    }

    return data || [];
};

export const createTask = async (task: NewTask): Promise<Task> => {
    const { data, error } = await supabase
        .from('tasks')
        .insert([task])
        .select()
        .single();

    if (error) {
        console.error('Error creating task:', error);
        throw error;
    }

    return data;
};

export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
    const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating task:', error);
        throw error;
    }

    return data;
};

export const deleteTask = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
};

export const getReminders = async (): Promise<Task[]> => {
    const { data, error } = await supabase
        .from('tasks')
        .select(`
            *,
            projects (
                title
            )
        `)
        .not('reminder_date', 'is', null)
        .eq('is_completed', false)
        .order('reminder_date', { ascending: true });

    if (error) {
        console.error('Error fetching reminders:', error);
        throw error;
    }

    return data || [];
};
