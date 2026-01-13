import { supabase } from '../lib/supabase';
import type { Installment, NewInstallment } from '../types';

export const getProjectInstallments = async (projectId: string) => {
    const { data, error } = await supabase
        .from('project_installments')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    return data as Installment[];
};

export const createInstallment = async (installment: NewInstallment) => {
    const { data, error } = await supabase
        .from('project_installments')
        .insert([installment])
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as Installment;
};

export const createInstallments = async (installments: NewInstallment[]) => {
    const { data, error } = await supabase
        .from('project_installments')
        .insert(installments)
        .select();

    if (error) {
        throw new Error(error.message);
    }

    return data as Installment[];
};

export const updateInstallment = async (id: string, updates: Partial<Installment>) => {
    const { data, error } = await supabase
        .from('project_installments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as Installment;
};

export const deleteInstallment = async (id: string) => {
    const { error } = await supabase
        .from('project_installments')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(error.message);
    }
};
