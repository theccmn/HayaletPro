import { supabase } from "../lib/supabase";
import type { Transaction, NewTransaction } from "../types";

export const getTransactions = async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
            *,
            projects (
                title
            )
        `)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }

    return data || [];
};

export const createTransaction = async (transaction: NewTransaction): Promise<Transaction> => {
    const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();

    if (error) {
        console.error('Error creating transaction:', error);
        throw error;
    }

    return data;
};

export const updateTransaction = async (id: string, updates: Partial<NewTransaction>): Promise<Transaction> => {
    const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating transaction:', error);
        throw error;
    }

    return data;
};

export const deleteTransaction = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
};
