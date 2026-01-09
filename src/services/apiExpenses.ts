import { supabase } from "../lib/supabase";
import type { Expense } from "../types";

export type NewExpense = Omit<Expense, 'id' | 'created_at' | 'projects'>;

export const getExpenses = async (): Promise<Expense[]> => {
    const { data, error } = await supabase
        .from('expenses')
        .select(`
            *,
            projects (
                title
            )
        `)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching expenses:', error);
        throw error;
    }

    return data || [];
};

export const createExpense = async (expense: NewExpense): Promise<Expense> => {
    const { data, error } = await supabase
        .from('expenses')
        .insert([expense])
        .select()
        .single();

    if (error) {
        console.error('Error creating expense:', error);
        throw error;
    }

    return data;
};

export const updateExpense = async (id: string, updates: Partial<NewExpense>): Promise<Expense> => {
    const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating expense:', error);
        throw error;
    }

    return data;
};

export const deleteExpense = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting expense:', error);
        throw error;
    }
};
