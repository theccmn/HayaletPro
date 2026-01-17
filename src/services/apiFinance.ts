import { supabase } from "../lib/supabase";
import type { Transaction, NewTransaction, FinanceSetting, NewFinanceSetting } from "../types";

export const getTransactions = async (projectId?: string): Promise<Transaction[]> => {
    let query = supabase
        .from('transactions')
        .select(`
            *,
            projects (
                title
            )
        `)
        .order('date', { ascending: false });

    if (projectId && typeof projectId === 'string') {
        query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

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
    if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
};

// --- Finance Settings API ---

export const getFinanceSettings = async (type: FinanceSetting['type']): Promise<FinanceSetting[]> => {
    const { data, error } = await supabase
        .from('finance_settings')
        .select('*')
        .eq('type', type)
        .eq('is_visible', true)
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error fetching finance settings:', error);
        throw error;
    }

    return data || [];
};

export const createFinanceSetting = async (setting: NewFinanceSetting): Promise<FinanceSetting> => {
    // Get max order index to append to end
    const { data: maxOrderData } = await supabase
        .from('finance_settings')
        .select('order_index')
        .eq('type', setting.type)
        .order('order_index', { ascending: false })
        .limit(1);

    const nextOrder = (maxOrderData?.[0]?.order_index || 0) + 1;

    const { data, error } = await supabase
        .from('finance_settings')
        .insert([{ ...setting, order_index: nextOrder }])
        .select()
        .single();

    if (error) {
        console.error('Error creating finance setting:', error);
        throw error;
    }

    return data;
};

export const updateFinanceSetting = async (id: string, updates: Partial<FinanceSetting>): Promise<FinanceSetting> => {
    const { data, error } = await supabase
        .from('finance_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating finance setting:', error);
        throw error;
    }

    return data;
};

export const deleteFinanceSetting = async (id: string): Promise<void> => {
    // Soft delete by setting is_visible to false, or hard delete. User asked to "delete".
    // Let's hard delete for cleanup unless history is strict. 
    // Actually, to preserve transaction history, we ideally shouldn't delete the label from transactions, 
    // but the transaction table stores the string value, not ID. So hard delete is safe for future Lists.
    const { error } = await supabase
        .from('finance_settings')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting finance setting:', error);
        throw error;
    }
};

export const reorderFinanceSettings = async (items: { id: string; order_index: number }[]): Promise<void> => {
    // Batch update is not directly supported in Supabase JS easily without RPC or multiple requests.
    // For a small list, multiple requests are "okay" but not ideal.
    // We'll iterate.
    const updates = items.map(item =>
        supabase.from('finance_settings').update({ order_index: item.order_index }).eq('id', item.id)
    );

    await Promise.all(updates);
};
